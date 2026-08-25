import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { PagosService } from '../src/modules/pagos/pagos.service';
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
 * HU EFDS-1170 · Tramitar pagos del contrato (actividad 9.4).
 *
 * Va sobre un contrato en ejecución, así que el camino incluye toda la etapa 8
 * y el acta de inicio (EFDS-1167). Nada de esto se ve en una prueba unitaria:
 * cada eslabón vive en la tabla de otra actividad.
 *
 * **Alcance:** sin integración con Click. Los soportes se cargan a mano y eso
 * es lo que se prueba.
 */
describe('HU EFDS-1170 · trámite de pagos del contrato (9.4)', () => {
  let app: INestApplication;
  let pagos: PagosService;
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
  const OBJETO = 'Tramite de pagos para pruebas';

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
    const documento = `9004444${String(n).padStart(2, '0')}-4`;

    const proceso = await procesos.crearProceso(
      { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: VALOR_CONTRATO },
      gestor,
    );

    await cdp.solicitar(proceso.id, { rubro: 'A-02-02', valor: VALOR_CONTRATO }, gestor);
    await cdp.verificar(proceso.id, financiero);
    await cdp.expedir(
      proceso.id,
      { numero: `CDP-2026-170-${n}`, valor: VALOR_CONTRATO, fechaExpedicion: hoy() },
      financiero,
    );

    await apertura.registrar(
      proceso.id,
      { resolucionNumero: `RES-2026-170-${n}`, resolucionFecha: hoy() },
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
        numeroActo: `RES-ADJ-2026-170-${n}`,
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
        numero: `CTO-2026-170-${n}`,
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
        numeroPoliza: `POL-170-${n}`,
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

  const radicar = (procesoId: string, datos: Record<string, unknown> = {}) =>
    pagos.radicar(
      procesoId,
      {
        periodoDesde: haceDias(30),
        periodoHasta: haceDias(1),
        valor: 10_000_000,
        ...datos,
      } as any,
      archivo('factura.pdf'),
      'x'.repeat(64),
      archivo('informe-actividades.pdf'),
      'y'.repeat(64),
      gestor,
    );

  // ------------------------------------------------------------ criterio --

  describe('Criterio 1 · factura, informe y aval tramitan el pago', () => {
    it('recorre el trámite completo hasta dejar el pago tramitado', async () => {
      const proceso = await contratoEnEjecucion();

      const radicado = await radicar(proceso.id);
      expect(radicado.pagos).toHaveLength(1);
      expect(radicado.pagos[0].estado).toBe('RADICADO');
      expect(radicado.pagos[0].numero).toBe(1);
      expect(radicado.pagos[0].factura).not.toBeNull();
      expect(radicado.pagos[0].informe).not.toBeNull();

      const avalado = await pagos.avalar(
        proceso.id,
        radicado.pagos[0].id,
        { observacion: 'Las actividades del periodo se cumplieron' },
        supervisor,
      );
      expect(avalado.pagos[0].estado).toBe('AVALADO');
      expect(avalado.pagos[0].avaladoPor).toBe(supervisor.userName);

      const tramitado = await pagos.tramitar(
        proceso.id,
        radicado.pagos[0].id,
        { referenciaPago: 'OP-2026-4471' },
        financiero,
      );
      expect(tramitado.pagos[0].estado).toBe('TRAMITADO');
      expect(tramitado.pagos[0].referenciaPago).toBe('OP-2026-4471');
      expect(tramitado.resumen.tramitado).toBe(10_000_000);
      expect(tramitado.resumen.saldo).toBe(VALOR_CONTRATO - 10_000_000);
    });

    it('no deja tramitar lo que el supervisor no avaló', async () => {
      const proceso = await contratoEnEjecucion();
      const radicado = await radicar(proceso.id);

      await expect(
        pagos.tramitar(
          proceso.id,
          radicado.pagos[0].id,
          { referenciaPago: 'OP-2026-0001' },
          financiero,
        ),
      ).rejects.toThrow(/todavía no la ha avalado/i);
    });

    it('numera las cuentas de corrido dentro del contrato', async () => {
      const proceso = await contratoEnEjecucion();

      await radicar(proceso.id, { valor: 5_000_000 });
      const segunda = await radicar(proceso.id, { valor: 5_000_000 });

      // La lista viene de la más nueva a la más vieja.
      expect(segunda.pagos.map((p) => p.numero)).toEqual([2, 1]);
    });
  });

  describe('Criterio 2 · solo se cobra lo que ya se está ejecutando', () => {
    it('no admite cuentas sobre un contrato que no arrancó', async () => {
      const proceso = await hastaContratoLegalizado();

      // Legalizado pero sin acta de inicio: es justo lo que EFDS-1167 aporta.
      await expect(radicar(proceso.id)).rejects.toThrow(/acta de inicio/i);
    });

    it('no deja cobrar un periodo anterior al inicio de la ejecución', async () => {
      const proceso = await contratoEnEjecucion(haceDias(10));

      await expect(
        radicar(proceso.id, { periodoDesde: haceDias(40), periodoHasta: haceDias(1) }),
      ).rejects.toThrow(/no se cobra un periodo anterior/i);
    });

    it('rechaza un periodo invertido', async () => {
      const proceso = await contratoEnEjecucion();

      await expect(
        radicar(proceso.id, { periodoDesde: haceDias(1), periodoHasta: haceDias(20) }),
      ).rejects.toThrow(/anterior a su inicio/i);
    });
  });

  describe('Criterio 3 · el aval es de quien vigila, no de quien tiene el rol', () => {
    it('el supervisor de otro contrato no puede avalar', async () => {
      const proceso = await contratoEnEjecucion();
      const radicado = await radicar(proceso.id);

      // Tiene SUPERVISOR_CONTRATO y llega hasta aquí: lo que lo detiene es no
      // ser el supervisor de este contrato, que es la regla de EFDS-1438.
      await expect(
        pagos.avalar(proceso.id, radicado.pagos[0].id, {}, otroSupervisor),
      ).rejects.toThrow(/no eres el supervisor de este contrato/i);
    });

    it('devolver deja la cuenta corregible y sin aval', async () => {
      const proceso = await contratoEnEjecucion();
      const radicado = await radicar(proceso.id);

      const devuelto = await pagos.devolver(
        proceso.id,
        radicado.pagos[0].id,
        { motivo: 'El informe de actividades no cubre todo el periodo cobrado' },
        supervisor,
      );

      expect(devuelto.pagos[0].estado).toBe('DEVUELTO');
      expect(devuelto.pagos[0].motivoDevolucion).toMatch(/no cubre todo el periodo/i);
      // Sin aval: dejarlo permitiría tramitarla saltándose la corrección.
      expect(devuelto.pagos[0].avaladoAt).toBeNull();

      await expect(
        pagos.tramitar(
          proceso.id,
          radicado.pagos[0].id,
          { referenciaPago: 'OP-2026-0002' },
          financiero,
        ),
      ).rejects.toThrow(/no se puede tramitar/i);
    });

    it('la devuelta no se reabre: se corrige radicando una cuenta nueva', async () => {
      const proceso = await contratoEnEjecucion();
      const radicado = await radicar(proceso.id);
      await pagos.devolver(
        proceso.id,
        radicado.pagos[0].id,
        { motivo: 'El informe de actividades no cubre todo el periodo cobrado' },
        supervisor,
      );

      // La factura y el informe se fijan al radicar y no hay como
      // reemplazarlos, asi que reabrir la devuelta la dejaria avalada con los
      // documentos que el supervisor rechazo. Se radica otra.
      await expect(
        pagos.avalar(proceso.id, radicado.pagos[0].id, {}, supervisor),
      ).rejects.toThrow(/no se puede avalar una cuenta devuelta/i);

      const corregida = await radicar(proceso.id, { valor: 8_000_000 });
      const avalada = await pagos.avalar(
        proceso.id,
        corregida.pagos[0].id,
        {},
        supervisor,
      );

      // Las dos quedan: la devuelta explica por que hubo dos cuentas del mismo
      // periodo, y solo la nueva cuenta contra el valor del contrato.
      expect(avalada.pagos.map((p) => p.estado)).toEqual(['AVALADO', 'DEVUELTO']);
      expect(avalada.resumen.cobrado).toBe(8_000_000);
    });
  });

  describe('Criterio 4 · los soportes que Click evitaría pedir', () => {
    it('suma seguridad social y RUT a la cuenta radicada', async () => {
      const proceso = await contratoEnEjecucion();
      const radicado = await radicar(proceso.id);
      const pagoId = radicado.pagos[0].id;

      await pagos.cargarSoporte(
        proceso.id,
        pagoId,
        { tipo: 'SEGURIDAD_SOCIAL' },
        archivo('planilla.pdf'),
        's'.repeat(64),
        gestor,
      );
      const conSoportes = await pagos.cargarSoporte(
        proceso.id,
        pagoId,
        { tipo: 'RUT' },
        archivo('rut.pdf'),
        't'.repeat(64),
        gestor,
      );

      expect(conSoportes.pagos[0].soportes.map((s: any) => s.tipo)).toEqual([
        'SEGURIDAD_SOCIAL',
        'RUT',
      ]);
      // Mientras esto sea falso, la carga es manual y la pantalla lo dice.
      expect(conSoportes.integracionClick).toBe(false);
    });

    it('no admite soportes sobre una cuenta ya tramitada', async () => {
      const proceso = await contratoEnEjecucion();
      const radicado = await radicar(proceso.id);
      const pagoId = radicado.pagos[0].id;

      await pagos.avalar(proceso.id, pagoId, {}, supervisor);
      await pagos.tramitar(proceso.id, pagoId, { referenciaPago: 'OP-2026-0003' }, financiero);

      await expect(
        pagos.cargarSoporte(
          proceso.id,
          pagoId,
          { tipo: 'OTRO' },
          archivo('tardio.pdf'),
          'u'.repeat(64),
          gestor,
        ),
      ).rejects.toThrow(/ya se cerró/i);
    });
  });

  describe('Criterio 5 · el aviso cuando lo cobrado supera el contrato', () => {
    it('avisa sin bloquear la radicación', async () => {
      const proceso = await contratoEnEjecucion();

      await radicar(proceso.id, { valor: VALOR_CONTRATO });
      // La segunda se pasa del valor y aun así entra: pagarla o no es decisión
      // de la entidad, con el mismo criterio del CDP.
      const excedido = await radicar(proceso.id, { valor: 5_000_000 });

      expect(excedido.pagos).toHaveLength(2);
      expect(excedido.resumen.advertencia).toMatch(/supera el valor del contrato/i);
      expect(excedido.resumen.saldo).toBe(-5_000_000);
    });

    it('la cuenta anulada deja de contar contra el valor', async () => {
      const proceso = await contratoEnEjecucion();
      const primera = await radicar(proceso.id, { valor: VALOR_CONTRATO });

      const anulada = await pagos.anular(
        proceso.id,
        primera.pagos[0].id,
        { motivo: 'Se radicó con el valor de otro contrato' },
        gestor,
      );

      expect(anulada.pagos[0].estado).toBe('ANULADO');
      expect(anulada.resumen.cobrado).toBe(0);
      expect(anulada.resumen.advertencia).toBeNull();
    });

    it('no se anula un pago ya tramitado', async () => {
      const proceso = await contratoEnEjecucion();
      const radicado = await radicar(proceso.id);
      const pagoId = radicado.pagos[0].id;

      await pagos.avalar(proceso.id, pagoId, {}, supervisor);
      await pagos.tramitar(proceso.id, pagoId, { referenciaPago: 'OP-2026-0004' }, financiero);

      await expect(
        pagos.anular(proceso.id, pagoId, { motivo: 'Se radicó por error de digitación' }, gestor),
      ).rejects.toThrow(/ya se tramitó/i);
    });
  });

  describe('El riel y el expediente', () => {
    it('marca la 9.4 solo cuando un pago se tramitó de verdad', async () => {
      const proceso = await contratoEnEjecucion();
      const radicado = await radicar(proceso.id);

      const estadoDe = async () => {
        const [fila] = await dataSource.query(
          `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '9.4'`,
          [proceso.id],
        );
        return fila?.estado;
      };

      // Radicada y avalada, la actividad sigue en curso: todavía no hay pago.
      expect(await estadoDe()).toBe('BORRADOR');
      await pagos.avalar(proceso.id, radicado.pagos[0].id, {}, supervisor);
      expect(await estadoDe()).toBe('BORRADOR');

      await pagos.tramitar(
        proceso.id,
        radicado.pagos[0].id,
        { referenciaPago: 'OP-2026-0005' },
        financiero,
      );
      expect(await estadoDe()).toBe('APROBADO');
    });

    it('archiva la factura y el informe en el expediente bajo su numeral', async () => {
      const proceso = await contratoEnEjecucion();
      await radicar(proceso.id);

      const docs = await dataSource.query(
        `SELECT d.nombre FROM hiring.documentos d
           JOIN hiring.expedientes e ON e.id = d.expediente_id
          WHERE e.proceso_id = $1 AND d.numeral = '9.4' ORDER BY d.nombre`,
        [proceso.id],
      );

      expect(docs).toHaveLength(2);
      expect(docs.map((d: any) => d.nombre).join(' ')).toMatch(/factura/i);
      expect(docs.map((d: any) => d.nombre).join(' ')).toMatch(/informe de actividades/i);
    });

    it('deja traza de la radicación, el aval y el trámite', async () => {
      const proceso = await contratoEnEjecucion();
      const radicado = await radicar(proceso.id);
      const pagoId = radicado.pagos[0].id;

      await pagos.avalar(proceso.id, pagoId, {}, supervisor);
      await pagos.tramitar(proceso.id, pagoId, { referenciaPago: 'OP-2026-0006' }, financiero);

      const trazas = await dataSource.query(
        `SELECT accion FROM hiring.trazabilidad
          WHERE proceso_id = $1 AND entidad = 'pago_contrato' ORDER BY id ASC`,
        [proceso.id],
      );

      expect(trazas.map((t: any) => t.accion)).toEqual(['SOLICITAR', 'APROBAR', 'EXPEDIR']);
    });
  });
});
