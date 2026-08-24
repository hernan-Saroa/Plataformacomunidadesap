import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
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
import { RiesgosService } from '../src/modules/riesgos/riesgos.service';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { HiringAccess } from '../src/auth/hiring-access';

/**
 * HU EFDS-1159 · Adjudicar el proceso (actividades 7.1 a 7.4).
 *
 * La etapa 7 es la más encadenada del módulo: la audiencia va sobre un traslado
 * cerrado, el informe definitivo va después de la audiencia, y el acto va sobre
 * el informe publicado. Nada de eso se ve en una prueba unitaria, porque cada
 * eslabón vive en la tabla de otra actividad.
 *
 * Se recorren **las dos rutas que deja la matriz**: la licitación pública, que
 * celebra audiencia y abre sobre económico, y la selección abreviada de menor
 * cuantía, que no hace ninguna de las dos y adjudica directo. Que la segunda no
 * se quede esperando una audiencia que nunca va a existir es justamente lo que
 * hay que comprobar.
 */
describe('HU EFDS-1159 · adjudicación del proceso (7.1 a 7.4)', () => {
  let app: INestApplication;
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
  let riesgos: RiesgosService;
  let procesos: EstudioPrevioService;
  let dataSource: DataSource;

  /** Objeto propio de esta suite: las demás corren en paralelo (EFDS-1443). */
  const OBJETO = 'Adjudicacion para pruebas';

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

  let juridica: { acceso: HiringAccess; personaId: string };
  let tecnico: { acceso: HiringAccess; personaId: string };
  let financiera: { acceso: HiringAccess; personaId: string };

  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const haceHoras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const enDias = (d: number) => {
    const f = new Date();
    f.setUTCDate(f.getUTCDate() + d);
    return f.toISOString().slice(0, 10);
  };
  const archivo = (nombre: string, mimetype = 'application/pdf') => ({
    filename: `${nombre}-en-disco`,
    originalname: nombre,
    mimetype,
    size: 1024,
    path: `/tmp/${nombre}`,
  });

  const JUSTIFICACION =
    'Cumplió los requisitos habilitantes y obtuvo el mayor puntaje del comité evaluador.';
  const MEDIO = 'Publicado en SECOP II y notificado por correo a los oferentes';

  /**
   * Todo el camino hasta dejar el traslado cerrado, que es la condición de
   * entrada de la etapa 7.
   *
   * `LICITACION_PUBLICA` celebra audiencia y abre sobre económico;
   * `ABREVIADA_MENOR_CUANTIA` no hace ninguna de las dos según la matriz.
   */
  const hastaTrasladoCerrado = async (modalidad: string) => {
    const proceso = await procesos.crearProceso(
      { objeto: OBJETO, modalidad, valorEstimado: 1_000_000 },
      gestor,
    );

    await cdp.solicitar(proceso.id, { rubro: 'A-02-02', valor: 1_000_000 }, gestor);
    await cdp.verificar(proceso.id, financiero);
    await cdp.expedir(
      proceso.id,
      { numero: 'CDP-2026-159', valor: 1_000_000, fechaExpedicion: hoy() },
      financiero,
    );
    // La licitación pública no se abre sin la audiencia de asignación de
    // riesgos (5.5); la menor cuantía no la exige. Es la misma cadena de la
    // etapa 5, y aquí solo hay que satisfacerla para llegar a la 7.
    if (modalidad === 'LICITACION_PUBLICA') {
      await riesgos.registrar(
        proceso.id,
        { fechaCelebracion: hoy() },
        archivo('acta-riesgos.pdf'),
        'g'.repeat(64),
        archivo('matriz-riesgos.xlsx'),
        'h'.repeat(64),
        gestor,
      );
    }

    await apertura.registrar(
      proceso.id,
      { resolucionNumero: 'RES-2026-159', resolucionFecha: hoy() },
      archivo('resolucion.pdf'),
      'a'.repeat(64),
      archivo('pliego.pdf'),
      'b'.repeat(64),
      archivo('captura.png', 'image/png'),
      'e'.repeat(64),
      gestor,
    );

    await ofertas.fijarPlazo(proceso.id, { vencimiento: haceHoras(3) }, gestor);
    const registrar = (id: string, nombre: string, valor: number) =>
      ofertas.registrar(
        proceso.id,
        { nombre, identificacion: id, fechaRadicacion: haceHoras(4), valorOfertado: valor },
        archivo('oferta.pdf'),
        'o'.repeat(64),
        gestor,
      );
    await registrar('900111111-1', 'Barata SAS', 40_000_000);
    await registrar('900222222-2', 'Cara SAS', 50_000_000);

    const estado = await ofertas.cerrar(proceso.id, gestor);

    await comite.designar(
      proceso.id,
      {
        fechaDesignacion: hoy(),
        miembros: [
          { personaId: juridica.personaId, nombre: 'Evaluadora jurídica', rol: 'JURIDICO' },
          { personaId: tecnico.personaId, nombre: 'Evaluador técnico', rol: 'TECNICO' },
          { personaId: financiera.personaId, nombre: 'Evaluadora financiera', rol: 'FINANCIERO' },
        ],
      },
      archivo('memorando.pdf'),
      'm'.repeat(64),
      ordenador,
    );

    // Gana la segunda: así se nota si el definitivo toma otro resultado.
    await evaluacion.registrar(
      proceso.id,
      {
        oferenteId: estado.oferentes[1].id,
        puntajeObtenido: 92.5,
        puntajeMaximo: 100,
        justificacion: JUSTIFICACION,
      },
      archivo('informe-comite.pdf'),
      'i'.repeat(64),
      juridica.acceso,
    );

    await traslado.generar(
      proceso.id,
      {},
      archivo('informe-preliminar.pdf'),
      'p'.repeat(64),
      gestor,
    );
    await traslado.trasladar(
      proceso.id,
      { medioPublicacion: MEDIO },
      archivo('evidencia.png', 'image/png'),
      'v'.repeat(64),
      gestor,
    );

    return { proceso, oferentes: estado.oferentes };
  };

  /** El término se cuenta en días hábiles: esperarlo en una prueba no es opción. */
  const vencerYCerrar = async (procesoId: string) => {
    await dataSource.query(
      `UPDATE hiring.informes_evaluacion SET vence_el = $2 WHERE proceso_id = $1 AND estado = 'TRASLADADO'`,
      [procesoId, enDias(-1)],
    );
    await escritos.cerrar(procesoId, {}, gestor);
  };

  /** Proceso con el traslado ya cerrado, listo para la etapa 7. */
  const listoParaAdjudicar = async (modalidad = 'LICITACION_PUBLICA') => {
    const datos = await hastaTrasladoCerrado(modalidad);
    await vencerYCerrar(datos.proceso.id);
    return datos;
  };

  const celebrar = (procesoId: string) =>
    audiencia.celebrar(
      procesoId,
      {
        celebradaAt: new Date().toISOString(),
        presididaPor: 'Ordenadora del Gasto',
        resumen: 'Se oyeron las observaciones al informe y se abrieron los sobres.',
      },
      archivo('acta.pdf'),
      'c'.repeat(64),
      gestor,
    );

  const generarDefinitivo = (procesoId: string) =>
    definitivo.generar(procesoId, archivo('definitivo.pdf'), 'd'.repeat(64), gestor);

  const publicarDefinitivo = (procesoId: string) =>
    definitivo.publicar(
      procesoId,
      { medioPublicacion: MEDIO },
      archivo('evidencia-definitivo.png', 'image/png'),
      'w'.repeat(64),
      gestor,
    );

  /** Todo el camino hasta el informe definitivo publicado. */
  const conDefinitivoPublicado = async (modalidad = 'LICITACION_PUBLICA') => {
    const datos = await listoParaAdjudicar(modalidad);
    if (modalidad === 'LICITACION_PUBLICA') await celebrar(datos.proceso.id);
    await generarDefinitivo(datos.proceso.id);
    await publicarDefinitivo(datos.proceso.id);
    return datos;
  };

  const adjudicar = (
    procesoId: string,
    oferenteId: string,
    datos: Partial<{ justificacion: string; valorAdjudicado: number }> = {},
  ) =>
    acto.adjudicar(
      procesoId,
      {
        oferenteId,
        numeroActo: 'RES-ADJ-2026-159',
        fechaActo: hoy(),
        valorAdjudicado: 50_000_000,
        ...datos,
      },
      archivo('resolucion-adjudicacion.pdf'),
      'x'.repeat(64),
      ordenador,
    );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

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
    riesgos = app.get(RiesgosService);
    procesos = app.get(EstudioPrevioService);
    dataSource = app.get(DataSource);

    const cuentas = await dataSource.query(
      `SELECT id_user, id_person FROM auth."user" WHERE id_person IS NOT NULL ORDER BY id_user LIMIT 3`,
    );
    expect(cuentas).toHaveLength(3);

    juridica = {
      personaId: cuentas[0].id_person,
      acceso: {
        userId: cuentas[0].id_user,
        userName: 'prueba.juridica',
        roles: ['EVALUADOR_JURIDICO'],
        puedeEditar: false,
      },
    };
    tecnico = {
      personaId: cuentas[1].id_person,
      acceso: {
        userId: cuentas[1].id_user,
        userName: 'prueba.tecnico',
        roles: ['EVALUADOR_TECNICO'],
        puedeEditar: false,
      },
    };
    financiera = {
      personaId: cuentas[2].id_person,
      acceso: {
        userId: cuentas[2].id_user,
        userName: 'prueba.financiera',
        roles: ['EVALUADOR_FINANCIERO'],
        puedeEditar: false,
      },
    };
  });

  afterAll(async () => {
    const deProceso = `proceso_id IN (SELECT id FROM hiring.procesos WHERE objeto = $1)`;
    const deOfertas = `SELECT o.id FROM hiring.oferentes o JOIN hiring.recepciones_ofertas r ON r.id = o.recepcion_id WHERE r.${deProceso}`;
    const deAudiencias = `SELECT id FROM hiring.audiencias_adjudicacion WHERE ${deProceso}`;

    await dataSource.query(`DELETE FROM hiring.actos_adjudicacion WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.informes_definitivos WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(
      `DELETE FROM hiring.sobres_economicos WHERE audiencia_id IN (${deAudiencias})`,
      [OBJETO],
    );
    await dataSource.query(
      `DELETE FROM hiring.piezas_audiencia WHERE audiencia_id IN (${deAudiencias})`,
      [OBJETO],
    );
    await dataSource.query(`DELETE FROM hiring.audiencias_adjudicacion WHERE ${deProceso}`, [
      OBJETO,
    ]);
    await dataSource.query(
      `DELETE FROM hiring.subsanaciones WHERE informe_id IN (SELECT id FROM hiring.informes_evaluacion WHERE ${deProceso})`,
      [OBJETO],
    );
    await dataSource.query(`DELETE FROM hiring.informes_evaluacion WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(
      `DELETE FROM hiring.evidencias_evaluacion WHERE resultado_id IN (SELECT id FROM hiring.resultados_evaluacion WHERE ${deProceso})`,
      [OBJETO],
    );
    await dataSource.query(`DELETE FROM hiring.resultados_evaluacion WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(
      `DELETE FROM hiring.miembros_comite WHERE comite_id IN (SELECT id FROM hiring.comites_evaluadores WHERE ${deProceso})`,
      [OBJETO],
    );
    await dataSource.query(`DELETE FROM hiring.comites_evaluadores WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.oferentes WHERE id IN (${deOfertas})`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.recepciones_ofertas WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.audiencias_riesgos WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.cdp WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.procesos WHERE objeto = $1`, [OBJETO]);
    await app.close();
  });

  // ------------------------------------------------------------ criterio 1 --

  describe('Criterio 1 · la audiencia va sobre un traslado cerrado', () => {
    it('registra la audiencia con su acta y quién la presidió', async () => {
      const { proceso } = await listoParaAdjudicar();

      const estado = await celebrar(proceso.id);

      expect(estado.audiencia).not.toBeNull();
      expect(estado.audiencia!.estado).toBe('CELEBRADA');
      expect(estado.audiencia!.presididaPor).toBe('Ordenadora del Gasto');
      expect(estado.audiencia!.acta).not.toBeNull();
    });

    it('no celebra audiencia con el traslado todavía abierto', async () => {
      // El traslado queda corriendo: no se cierra a propósito.
      const { proceso } = await hastaTrasladoCerrado('LICITACION_PUBLICA');

      await expect(celebrar(proceso.id)).rejects.toThrow(/sigue abierto/i);
    });

    it('no celebra audiencia si el informe ni siquiera se trasladó', async () => {
      const proceso = await procesos.crearProceso(
        { objeto: OBJETO, modalidad: 'LICITACION_PUBLICA', valorEstimado: 1_000_000 },
        gestor,
      );

      // El mensaje distingue: aquí lo que falta es el traslado entero.
      await expect(celebrar(proceso.id)).rejects.toThrow(/va después del traslado/i);
    });

    it('la menor cuantía no celebra audiencia, y lo dice con el motivo', async () => {
      const { proceso } = await listoParaAdjudicar('ABREVIADA_MENOR_CUANTIA');

      const estado = await audiencia.estado(proceso.id);
      expect(estado.aplica).toBe(false);
      await expect(celebrar(proceso.id)).rejects.toThrow(/no adelanta la actividad 7\.1/i);
    });
  });

  // ------------------------------------------------------------ criterio 2 --

  describe('Criterio 2 · el sobre económico se abre en la audiencia', () => {
    it('abre el sobre y avisa cuando no coincide con lo declarado', async () => {
      const { proceso, oferentes } = await listoParaAdjudicar();
      await celebrar(proceso.id);

      const estado = await audiencia.abrirSobre(
        proceso.id,
        { oferenteId: oferentes[0].id, valorOfertado: 41_000_000 },
        null,
        null,
        gestor,
      );

      const sobre = estado.audiencia!.sobres[0];
      expect(sobre.valorOfertado).toBe(41_000_000);
      // La oferta había declarado 40.000.000 al presentarse.
      expect(sobre.valorDeclarado).toBe(40_000_000);
      expect(sobre.coincideConLoDeclarado).toBe(false);
    });

    it('cuando coincide, también lo dice', async () => {
      const { proceso, oferentes } = await listoParaAdjudicar();
      await celebrar(proceso.id);

      const estado = await audiencia.abrirSobre(
        proceso.id,
        { oferenteId: oferentes[0].id, valorOfertado: 40_000_000 },
        null,
        null,
        gestor,
      );

      expect(estado.audiencia!.sobres[0].coincideConLoDeclarado).toBe(true);
    });

    it('no abre dos veces el sobre de la misma oferta', async () => {
      const { proceso, oferentes } = await listoParaAdjudicar();
      await celebrar(proceso.id);
      await audiencia.abrirSobre(
        proceso.id,
        { oferenteId: oferentes[0].id, valorOfertado: 40_000_000 },
        null,
        null,
        gestor,
      );

      await expect(
        audiencia.abrirSobre(
          proceso.id,
          { oferenteId: oferentes[0].id, valorOfertado: 40_000_000 },
          null,
          null,
          gestor,
        ),
      ).rejects.toThrow(/ya se abrió/i);
    });

    it('la menor cuantía no abre sobre económico', async () => {
      const { proceso, oferentes } = await listoParaAdjudicar('ABREVIADA_MENOR_CUANTIA');

      await expect(
        audiencia.abrirSobre(
          proceso.id,
          { oferenteId: oferentes[0].id, valorOfertado: 40_000_000 },
          null,
          null,
          gestor,
        ),
      ).rejects.toThrow(/no adelanta la actividad 7\.2/i);
    });
  });

  // ------------------------------------------------------------ criterio 3 --

  describe('Criterio 3 · el informe definitivo toma el resultado vigente', () => {
    it('espera la audiencia donde la modalidad la tiene', async () => {
      const { proceso } = await listoParaAdjudicar();

      await expect(generarDefinitivo(proceso.id)).rejects.toThrow(/audiencia .* todavía no/i);
    });

    it('no espera audiencia donde la modalidad no la tiene', async () => {
      const { proceso } = await listoParaAdjudicar('ABREVIADA_MENOR_CUANTIA');

      // Sin esto, la menor cuantía se quedaría esperando algo que nunca ocurre.
      const estado = await generarDefinitivo(proceso.id);
      expect(estado.informe).not.toBeNull();
      expect(estado.audienciaPendiente).toBe(false);
    });

    /**
     * La diferencia con el preliminar, que es la decisión de fondo de la 7.3:
     * aquel congela lo que se notificó, este toma lo que quedó.
     */
    it('toma la rectificación del comité, no lo que se trasladó', async () => {
      const { proceso, oferentes } = await hastaTrasladoCerrado('ABREVIADA_MENOR_CUANTIA');

      // Durante el traslado se subsana y la entidad acepta.
      const tras = await escritos.registrar(
        proceso.id,
        {
          oferenteId: oferentes[0].id,
          tipo: 'SUBSANACION',
          presentadoPor: 'Barata SAS',
          fechaPresentacion: hoy(),
          asunto: 'Aporta certificación de experiencia',
          contenido: 'Se adjunta la certificación que no se cargó con la oferta.',
        },
        archivo('escrito.pdf'),
        's'.repeat(64),
        gestor,
      );
      await escritos.responder(
        proceso.id,
        tras.subsanaciones[0].id,
        { aceptada: true, respuesta: 'Se acepta la certificación aportada y se reevalúa.' },
        null,
        null,
        gestor,
      );
      await vencerYCerrar(proceso.id);

      // El comité rectifica y ahora gana la otra.
      await evaluacion.rectificar(
        proceso.id,
        { motivo: 'Se aceptó la certificación aportada en el traslado' },
        juridica.acceso,
      );
      await evaluacion.registrar(
        proceso.id,
        { oferenteId: oferentes[0].id, justificacion: JUSTIFICACION },
        archivo('informe-comite-2.pdf'),
        'j'.repeat(64),
        juridica.acceso,
      );

      const estado = await generarDefinitivo(proceso.id);

      expect(estado.informe!.resultado.ganadora.nombre).toBe('Barata SAS');
      // Y deja escrito por qué el desenlace no es el que se notificó.
      expect(estado.informe!.cambios.huboRectificacion).toBe(true);
      expect(estado.informe!.cambios.cambioLaGanadora).toBe(true);
      expect(estado.informe!.cambios.motivoRectificacion).toMatch(/certificación/i);
      expect(estado.informe!.cambios.subsanacionesAceptadas).toHaveLength(1);
      expect(estado.informe!.cambios.subsanacionesAceptadas[0].oferente).toBe('Barata SAS');
      expect(estado.informe!.cambios.escritosPresentados).toBe(1);

      // El informe preliminar sigue diciendo lo que se notificó.
      const preliminar = await traslado.estado(proceso.id, gestor);
      expect(preliminar.informe!.resultado.ganadora.nombre).toBe('Cara SAS');
    });

    it('sin cambios, el definitivo lo dice también', async () => {
      const { proceso } = await listoParaAdjudicar('ABREVIADA_MENOR_CUANTIA');

      const estado = await generarDefinitivo(proceso.id);

      expect(estado.informe!.cambios.huboRectificacion).toBe(false);
      expect(estado.informe!.cambios.cambioLaGanadora).toBe(false);
      expect(estado.informe!.cambios.escritosPresentados).toBe(0);
    });

    it('publicar deja la actividad 7.3 cumplida', async () => {
      const { proceso } = await listoParaAdjudicar('ABREVIADA_MENOR_CUANTIA');
      await generarDefinitivo(proceso.id);

      const estado = await publicarDefinitivo(proceso.id);

      expect(estado.informe!.estado).toBe('PUBLICADO');
      const actividad = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '7.3'`,
        [proceso.id],
      );
      expect(actividad[0].estado).toBe('APROBADO');
    });
  });

  // ------------------------------------------------------------ criterio 4 --

  describe('Criterio 4 · el acto adjudica sobre el informe publicado', () => {
    it('no adjudica sin informe definitivo publicado', async () => {
      const { proceso, oferentes } = await listoParaAdjudicar('ABREVIADA_MENOR_CUANTIA');
      await generarDefinitivo(proceso.id);

      // Generado pero no publicado: todavía se puede mover.
      await expect(adjudicar(proceso.id, oferentes[1].id)).rejects.toThrow(/no se ha publicado/i);
    });

    it('adjudica a la ganadora del informe y deja la 7.4 cumplida', async () => {
      const { proceso, oferentes } = await conDefinitivoPublicado('ABREVIADA_MENOR_CUANTIA');

      const estado = await adjudicar(proceso.id, oferentes[1].id);

      expect(estado.acto).not.toBeNull();
      expect(estado.acto!.adjudicatario!.nombre).toBe('Cara SAS');
      expect(estado.acto!.valorAdjudicado).toBe(50_000_000);
      expect(estado.acto!.emitidoPor).toBe('prueba.ordenador');

      const actividad = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '7.4'`,
        [proceso.id],
      );
      expect(actividad[0].estado).toBe('APROBADO');
    });

    it('exige justificación para adjudicar a una oferta distinta', async () => {
      const { proceso, oferentes } = await conDefinitivoPublicado('ABREVIADA_MENOR_CUANTIA');

      // El mensaje nombra a quien proponía el informe.
      await expect(adjudicar(proceso.id, oferentes[0].id)).rejects.toThrow(/Cara SAS/);
    });

    it('con justificación, adjudicar a otra oferta sí procede', async () => {
      const { proceso, oferentes } = await conDefinitivoPublicado('ABREVIADA_MENOR_CUANTIA');

      const estado = await adjudicar(proceso.id, oferentes[0].id, {
        justificacion: 'La ganadora no suscribió el contrato dentro del término',
        valorAdjudicado: 40_000_000,
      });

      expect(estado.acto!.adjudicatario!.nombre).toBe('Barata SAS');
    });

    it('no adjudica dos veces sin revocar el acto vigente', async () => {
      const { proceso, oferentes } = await conDefinitivoPublicado('ABREVIADA_MENOR_CUANTIA');
      await adjudicar(proceso.id, oferentes[1].id);

      await expect(adjudicar(proceso.id, oferentes[1].id)).rejects.toThrow(/revocar/i);
    });

    it('revocar conserva el acto anterior y permite emitir otro', async () => {
      const { proceso, oferentes } = await conDefinitivoPublicado('ABREVIADA_MENOR_CUANTIA');
      await adjudicar(proceso.id, oferentes[1].id);

      const tras = await acto.revocar(
        proceso.id,
        { motivo: 'Se revoca por vicio en la notificación del acto' },
        ordenador,
      );

      expect(tras.acto).toBeNull();
      expect(tras.revocados).toHaveLength(1);
      expect(tras.revocados[0].motivoRevocacion).toMatch(/vicio en la notificación/i);

      // Y el proceso vuelve a poder adjudicarse.
      const otra = await adjudicar(proceso.id, oferentes[1].id);
      expect(otra.acto).not.toBeNull();
    });

    it('notificar y publicar el acto deja su evidencia', async () => {
      const { proceso, oferentes } = await conDefinitivoPublicado('ABREVIADA_MENOR_CUANTIA');
      await adjudicar(proceso.id, oferentes[1].id);

      const estado = await acto.publicar(
        proceso.id,
        { medioPublicacion: MEDIO },
        archivo('evidencia-acto.png', 'image/png'),
        'y'.repeat(64),
        ordenador,
      );

      expect(estado.acto!.publicadoAt).not.toBeNull();
      expect(estado.acto!.notificadoAt).not.toBeNull();
      expect(estado.acto!.evidencia).not.toBeNull();
    });

    it('solo se adjudica a quien presentó oferta en este proceso', async () => {
      const { proceso } = await conDefinitivoPublicado('ABREVIADA_MENOR_CUANTIA');
      const otro = await listoParaAdjudicar('ABREVIADA_MENOR_CUANTIA');

      await expect(adjudicar(proceso.id, otro.oferentes[0].id)).rejects.toThrow(
        /no está en la lista de este proceso/i,
      );
    });
  });

  // ------------------------------------------------------------ criterio 5 --

  describe('Criterio 5 · la etapa 7 completa, punta a punta', () => {
    it('licitación pública: audiencia, sobre, definitivo y acto', async () => {
      const { proceso, oferentes } = await listoParaAdjudicar('LICITACION_PUBLICA');

      await celebrar(proceso.id);
      await audiencia.abrirSobre(
        proceso.id,
        { oferenteId: oferentes[1].id, valorOfertado: 50_000_000 },
        null,
        null,
        gestor,
      );
      await generarDefinitivo(proceso.id);
      await publicarDefinitivo(proceso.id);
      const estado = await adjudicar(proceso.id, oferentes[1].id);

      expect(estado.acto!.adjudicatario!.nombre).toBe('Cara SAS');

      const actividades = await dataSource.query(
        `SELECT numeral, estado FROM hiring.proceso_actividades
          WHERE proceso_id = $1 AND numeral IN ('7.1','7.2','7.3','7.4') ORDER BY numeral`,
        [proceso.id],
      );
      expect(actividades.map((a: any) => `${a.numeral}:${a.estado}`)).toEqual([
        '7.1:APROBADO',
        '7.2:APROBADO',
        '7.3:APROBADO',
        '7.4:APROBADO',
      ]);
    });

    it('menor cuantía: sin audiencia ni sobre, adjudica igual', async () => {
      const { proceso, oferentes } = await listoParaAdjudicar('ABREVIADA_MENOR_CUANTIA');

      await generarDefinitivo(proceso.id);
      await publicarDefinitivo(proceso.id);
      const estado = await adjudicar(proceso.id, oferentes[1].id);

      expect(estado.acto).not.toBeNull();

      // Las dos actividades que no aplican no dejan fila cumplida ni bloquean.
      const actividades = await dataSource.query(
        `SELECT numeral, estado FROM hiring.proceso_actividades
          WHERE proceso_id = $1 AND numeral IN ('7.1','7.2') AND estado = 'APROBADO'`,
        [proceso.id],
      );
      expect(actividades).toHaveLength(0);
    });
  });
});
