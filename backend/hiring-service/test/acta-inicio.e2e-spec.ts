import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { ActaInicioService } from '../src/modules/acta-inicio/acta-inicio.service';
import { ContratosService } from '../src/modules/contratos/contratos.service';
import { LegalizacionService } from '../src/modules/legalizacion/legalizacion.service';
import { SupervisionService } from '../src/modules/supervision/supervision.service';
import { AudienciaService } from '../src/modules/adjudicacion/audiencia.service';
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
 * HU EFDS-1167 · Suscribir el acta de inicio del contrato (actividad 9.1).
 *
 * Es la primera actividad de la etapa 9 y la más encadenada del módulo hasta
 * ahora: para llegar aquí un proceso tiene que adjudicarse, generar contrato,
 * que las dos partes lo firmen, aprobarse sus garantías y designarse su
 * supervisor. Nada de eso se ve en una prueba unitaria, porque cada eslabón
 * vive en la tabla de otra actividad.
 *
 * Se recorre con `ABREVIADA_MENOR_CUANTIA`, que adjudica sin audiencia ni sobre
 * económico: la etapa 7 ya prueba sus dos rutas en su propia suite, y repetirlo
 * aquí alargaría el camino sin cubrir nada nuevo.
 */
describe('HU EFDS-1167 · acta de inicio del contrato (9.1)', () => {
  let app: INestApplication;
  let actaInicio: ActaInicioService;
  let contratos: ContratosService;
  let legalizacion: LegalizacionService;
  let supervision: SupervisionService;
  let audiencia: AudienciaService;
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
  const OBJETO = 'Acta de inicio para pruebas';

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
  /** La poliza la aprueba alguien distinto de quien la cargo (EFDS-1164). */
  const revisor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000005',
    userName: 'prueba.revisor',
    roles: ['REVISOR_CONTRATACION'],
    puedeEditar: false,
  };
  const supervisor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000009',
    userName: 'prueba.supervisor',
    roles: ['SUPERVISOR_CONTRATO'],
    puedeEditar: false,
  };

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

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = modulo.createNestApplication();
    await app.init();

    actaInicio = app.get(ActaInicioService);
    contratos = app.get(ContratosService);
    legalizacion = app.get(LegalizacionService);
    supervision = app.get(SupervisionService);
    audiencia = app.get(AudienciaService);
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

    // La cuenta y la persona tienen que corresponderse: el registro del
    // resultado no lo autoriza el rol sino la membresia en el comite del
    // proceso (EFDS-1438), y esa se guarda por persona.
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
  });

  afterAll(async () => {
    // En orden inverso al de creacion: las llaves foraneas del expediente no
    // dejan borrar el proceso mientras cuelgue algo de el.
    const deProceso = `proceso_id IN (SELECT id FROM hiring.procesos WHERE objeto = $1)`;
    const deContratos = `SELECT id FROM hiring.contratos WHERE ${deProceso}`;
    const borrar = (sql: string) => dataSource.query(sql, [OBJETO]);

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
   * Todo el camino hasta dejar el contrato legalizado y con supervisor, que es
   * la condición de entrada de la 9.1.
   */
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

  const hastaContratoLegalizado = async () => {
    const n = ++vuelta;
    const proceso = await procesos.crearProceso(
      { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: 80_000_000 },
      gestor,
    );

    await cdp.solicitar(proceso.id, { rubro: 'A-02-02', valor: 80_000_000 }, gestor);
    await cdp.verificar(proceso.id, financiero);
    await cdp.expedir(
      proceso.id,
      { numero: `CDP-2026-167-${n}`, valor: 80_000_000, fechaExpedicion: hoy() },
      financiero,
    );

    await apertura.registrar(
      proceso.id,
      { resolucionNumero: `RES-2026-167-${n}`, resolucionFecha: hoy() },
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
        nombre: 'Constructora Andina SAS',
        identificacion: `9003333${String(n).padStart(2, '0')}-3`,
        fechaRadicacion: haceHoras(4),
        valorOfertado: 78_000_000,
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
    // El termino se cuenta en dias habiles: esperarlo en una prueba no es
    // opcion, asi que se vence a mano, como hace la suite de la etapa 7.
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
        numeroActo: `RES-ADJ-2026-167-${n}`,
        fechaActo: hoy(),
        valorAdjudicado: 78_000_000,
      },
      archivo('acto.pdf'),
      'j'.repeat(64),
      ordenador,
    );

    // ------------------------------------------------------------ etapa 8 --

    await contratos.generar(
      proceso.id,
      {
        tipologia: 'OBRA_PUBLICA',
        numero: `CTO-2026-167-${CORRIDA}-${n}`,
        objeto: 'Construcción de la sede regional',
        valor: 78_000_000,
        plazoDias: 180,
        contratistaDocumento: `9003333${String(n).padStart(2, '0')}-3`,
        contratistaNombre: 'Constructora Andina SAS',
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
        numeroPoliza: `POL-167-${CORRIDA}-${n}`,
        amparos: [
          {
            tipo: 'CUMPLIMIENTO',
            valorAsegurado: 15_600_000,
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
        nombre: 'Supervisora del contrato',
        cargo: 'Profesional especializada',
        fechaDesignacion: hoy(),
      },
      archivo('acto-supervision.pdf'),
      'z'.repeat(64),
      ordenador,
    );

    return proceso;
  };

  const suscribir = (procesoId: string, datos: Record<string, unknown> = {}) =>
    actaInicio.suscribir(
      procesoId,
      {
        fechaReunion: hoy(),
        fechaInicio: hoy(),
        asistentes: 'Supervisora del contrato y representante legal del contratista',
        compromisos: 'Se socializó el alcance, el cronograma y los entregables.',
        ...datos,
      } as any,
      archivo('acta-inicio.pdf'),
      'k'.repeat(64),
      supervisor,
    );

  // ------------------------------------------------------------- criterio --

  describe('Criterio 1 · el acta va sobre un contrato legalizado y con supervisor', () => {
    it('suscribe el acta y deja el contrato en ejecución', async () => {
      const proceso = await hastaContratoLegalizado();

      const estado = await suscribir(proceso.id);

      expect(estado.acta).not.toBeNull();
      expect(estado.acta!.fechaInicio).toBe(hoy());
      expect(estado.contrato!.estado).toBe('EJECUCION');
      expect(estado.contrato!.enEjecucionAt).not.toBeNull();
      expect(estado.puedeSuscribir).toBe(false);
    });

    it('no deja suscribir sobre un contrato que todavía no está legalizado', async () => {
      const proceso = await procesos.crearProceso(
        { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: 80_000_000 },
        gestor,
      );

      // Sin contrato siquiera generado: es el escalón más bajo del rechazo, y
      // el mensaje tiene que decir qué falta, no un «no se puede» seco.
      await expect(suscribir(proceso.id)).rejects.toThrow(/no tiene contrato/i);
    });

    it('exige supervisor designado aunque el contrato esté legalizado', async () => {
      const proceso = await hastaContratoLegalizado();

      // Se releva al supervisor: el contrato queda legalizado y sin quien lo
      // vigile, que es justo el caso que el criterio de la historia excluye.
      await supervision.relevar(
        proceso.id,
        { motivo: 'Traslado de la profesional a otra dependencia' },
        ordenador,
      );

      await expect(suscribir(proceso.id)).rejects.toThrow(/supervisor/i);
    });
  });

  describe('Criterio 2 · las fechas dicen la verdad', () => {
    it('no registra una reunión que todavía no ocurrió', async () => {
      const proceso = await hastaContratoLegalizado();

      await expect(
        suscribir(proceso.id, { fechaReunion: enDias(3), fechaInicio: enDias(3) }),
      ).rejects.toThrow(/no puede ser futura/i);
    });

    it('no deja que la ejecución empiece antes de la reunión que la acordó', async () => {
      const proceso = await hastaContratoLegalizado();

      await expect(
        suscribir(proceso.id, { fechaReunion: hoy(), fechaInicio: haceDias(5) }),
      ).rejects.toThrow(/antes de la reunión/i);
    });

    it('admite que el inicio se pacte hacia adelante y calcula la terminación', async () => {
      const proceso = await hastaContratoLegalizado();

      // Es lo corriente: se reúnen hoy y pactan que la ejecución arranque el
      // primero del mes entrante.
      const estado = await suscribir(proceso.id, {
        fechaReunion: haceDias(2),
        fechaInicio: enDias(5),
      });

      expect(estado.acta!.fechaInicio).toBe(enDias(5));
      // El contrato del helper tiene plazo de 180 días.
      expect(estado.acta!.fechaTerminacionEstimada).toBe(enDias(185));
    });
  });

  describe('Criterio 3 · el acta se anula, no se borra', () => {
    it('anular devuelve el contrato a legalizado y conserva el acta', async () => {
      const proceso = await hastaContratoLegalizado();
      await suscribir(proceso.id);

      const estado = await actaInicio.anular(
        proceso.id,
        { motivo: 'La fecha de inicio quedó mal transcrita del acta firmada' },
        supervisor,
      );

      expect(estado.acta).toBeNull();
      expect(estado.contrato!.estado).toBe('LEGALIZADO');
      expect(estado.contrato!.enEjecucionAt).toBeNull();
      // No desaparece: es lo que explica que el contrato tenga dos fechas.
      expect(estado.historial).toHaveLength(1);
      expect((estado.historial[0] as any).motivoAnulacion).toMatch(/mal transcrita/i);
    });

    it('deja suscribir otra después de anular', async () => {
      const proceso = await hastaContratoLegalizado();
      await suscribir(proceso.id);
      await actaInicio.anular(
        proceso.id,
        { motivo: 'La fecha de inicio quedó mal transcrita del acta firmada' },
        supervisor,
      );

      const estado = await suscribir(proceso.id, { fechaInicio: enDias(2) });

      expect(estado.acta!.fechaInicio).toBe(enDias(2));
      expect(estado.contrato!.estado).toBe('EJECUCION');
      expect(estado.historial).toHaveLength(1);
    });

    it('no deja dos actas vigentes a la vez', async () => {
      const proceso = await hastaContratoLegalizado();
      await suscribir(proceso.id);

      await expect(suscribir(proceso.id)).rejects.toThrow(/ya tiene acta de inicio/i);
    });
  });

  describe('El riel y el expediente', () => {
    it('marca la 9.1 cumplida y la devuelve en curso al anular', async () => {
      const proceso = await hastaContratoLegalizado();
      await suscribir(proceso.id);

      const estadoDe = async () => {
        const [fila] = await dataSource.query(
          `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '9.1'`,
          [proceso.id],
        );
        return fila?.estado;
      };

      expect(await estadoDe()).toBe('APROBADO');

      await actaInicio.anular(
        proceso.id,
        { motivo: 'La fecha de inicio quedó mal transcrita del acta firmada' },
        supervisor,
      );

      // El contrato deja de estar en ejecución hasta que se suscriba otra, y el
      // riel tiene que decirlo en vez de quedarse en verde.
      expect(await estadoDe()).toBe('BORRADOR');
    });

    it('archiva el acta en el expediente bajo su numeral', async () => {
      const proceso = await hastaContratoLegalizado();
      await suscribir(proceso.id);

      const docs = await dataSource.query(
        `SELECT d.numeral, d.nombre FROM hiring.documentos d
           JOIN hiring.expedientes e ON e.id = d.expediente_id
          WHERE e.proceso_id = $1 AND d.numeral = '9.1'`,
        [proceso.id],
      );

      expect(docs).toHaveLength(1);
      expect(docs[0].nombre).toMatch(/acta de inicio/i);
    });

    it('deja traza de que el contrato empezó a correr', async () => {
      const proceso = await hastaContratoLegalizado();
      await suscribir(proceso.id);

      const [traza] = await dataSource.query(
        `SELECT accion, detalle FROM hiring.trazabilidad
          WHERE proceso_id = $1 AND entidad = 'acta_inicio' ORDER BY id DESC LIMIT 1`,
        [proceso.id],
      );

      expect(traza.accion).toBe('INICIAR');
      expect(traza.detalle.actividad).toBe('9.1');
    });
  });

  // --------------------------------------------------- llegada al riel --

  describe('La etapa 9 llega al riel del proceso', () => {
    it('lista la 9.1 junto a las actividades de las etapas anteriores', async () => {
      const proceso = await procesos.crearProceso(
        { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: 80_000_000 },
        gestor,
      );

      // La misma prueba que tienen la 6 y la 7 en sus suites, y por el mismo
      // motivo: sembrar la actividad en hiring.actividades no basta, porque el
      // riel solo recibe las etapas de ETAPAS_ENTREGADAS. Las tres etapas
      // anteriores llegaron construidas y sin forma de abrirlas desde la
      // pantalla, y ninguna prueba lo vio.
      const actividades = await cdp.actividadesDelProceso(proceso.id);
      const numerales = actividades.map((a) => a.numeral);

      expect(numerales).toContain('9.1');
      // Y sin perder las que ya estaban.
      expect(numerales).toContain('8.1');
      expect(numerales).toContain('7.4');
      expect(numerales).toContain('6.1');
      expect(numerales).toContain('3.1');
    });
  });
});
