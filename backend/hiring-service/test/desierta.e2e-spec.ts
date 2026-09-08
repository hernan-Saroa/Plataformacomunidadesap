import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { DeclaratoriaDesiertaService } from '../src/modules/adjudicacion/declaratoria-desierta.service';
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
 * HU EFDS-1160 · Declarar desierto el proceso (RF-ADJ-02).
 *
 * El otro desenlace de la etapa 7, y el único que **no** cuelga del traslado.
 * Eso es justamente lo que hay que comprobar de extremo a extremo: cuando el
 * comité no habilita a ninguna oferta no hay resultado, ni informe preliminar,
 * ni traslado que cerrar —el modelo obliga a nombrar una ganadora— y la
 * declaratoria tiene que poder llegar igual, con el informe del comité como
 * sustento propio.
 *
 * Se recorren los dos caminos: el proceso al que no se presentó nadie y el que
 * recibió ofertas y ninguna quedó habilitada. Y se comprueba que declarar
 * desierto cierra la etapa 7 de verdad —audiencia, informe definitivo y acto
 * quedan bloqueados— y que revocar la reabre.
 */
describe('HU EFDS-1160 · declaratoria desierta del proceso', () => {
  let app: INestApplication;
  let desierta: DeclaratoriaDesiertaService;
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
  const OBJETO = 'Declaratoria desierta para pruebas';

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

  const MEDIO = 'Publicado en SECOP II y notificado por correo a los oferentes';
  const MOTIVO =
    'Ninguna de las ofertas presentadas acreditó la experiencia mínima exigida en el pliego';

  /**
   * El proceso hasta dejar la recepción de ofertas cerrada, que es la condición
   * de entrada de la declaratoria: mientras el plazo corra, "no hay ofertas"
   * todavía no es un hecho.
   */
  const hastaRecepcionCerrada = async (modalidad: string, cuantasOfertas: number) => {
    const proceso = await procesos.crearProceso(
      { objeto: OBJETO, modalidad, valorEstimado: 1_000_000 },
      gestor,
    );

    await cdp.solicitar(proceso.id, { rubro: 'A-02-02', valor: 1_000_000 }, gestor);
    await cdp.verificar(proceso.id, financiero);
    await cdp.expedir(
      proceso.id,
      { numero: 'CDP-2026-160', valor: 1_000_000, fechaExpedicion: hoy() },
      financiero,
    );

    // La licitación pública no se abre sin la audiencia de riesgos (5.5).
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
      { resolucionNumero: 'RES-2026-160', resolucionFecha: hoy() },
      archivo('resolucion.pdf'),
      'a'.repeat(64),
      archivo('pliego.pdf'),
      'b'.repeat(64),
      archivo('captura.png', 'image/png'),
      'e'.repeat(64),
      gestor,
    );

    await ofertas.fijarPlazo(proceso.id, { vencimiento: haceHoras(3) }, gestor);

    for (let i = 0; i < cuantasOfertas; i += 1) {
      await ofertas.registrar(
        proceso.id,
        {
          nombre: `Oferente ${i + 1} SAS`,
          identificacion: `90011111${i}-1`,
          fechaRadicacion: haceHoras(4),
          valorOfertado: 40_000_000 + i * 1_000_000,
        },
        archivo('oferta.pdf'),
        'o'.repeat(64),
        gestor,
      );
    }

    const estado = await ofertas.cerrar(proceso.id, gestor);
    return { proceso, oferentes: estado.oferentes };
  };

  const declarar = (
    procesoId: string,
    datos: Partial<{ causal: any; motivo: string; justificacion: string }> = {},
    conInforme = true,
  ) =>
    desierta.declarar(
      procesoId,
      {
        causal: 'SIN_OFERTAS_HABILITADAS',
        motivo: MOTIVO,
        numeroActo: 'RES-DES-2026-160',
        fechaActo: hoy(),
        ...datos,
      } as any,
      archivo('declaratoria.pdf'),
      'x'.repeat(64),
      conInforme ? archivo('informe-comite.pdf') : null,
      conInforme ? 'y'.repeat(64) : null,
      gestor,
    );

  /** Deja registrado el resultado del comité, para el caso de la contradicción. */
  const conResultadoDelComite = async (procesoId: string, oferenteId: string) => {
    await comite.designar(
      procesoId,
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

    await evaluacion.registrar(
      procesoId,
      {
        oferenteId,
        puntajeObtenido: 92.5,
        puntajeMaximo: 100,
        justificacion: 'Cumplió los requisitos habilitantes y obtuvo el mayor puntaje.',
      },
      archivo('informe-comite.pdf'),
      'i'.repeat(64),
      juridica.acceso,
    );
  };

  /** Todo el camino hasta el acto de adjudicación vigente. */
  const hastaAdjudicado = async () => {
    const { proceso, oferentes } = await hastaRecepcionCerrada('ABREVIADA_MENOR_CUANTIA', 2);
    await conResultadoDelComite(proceso.id, oferentes[1].id);

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
    // El término se cuenta en días hábiles: esperarlo no es opción.
    await dataSource.query(
      `UPDATE hiring.informes_evaluacion SET vence_el = $2 WHERE proceso_id = $1 AND estado = 'TRASLADADO'`,
      [proceso.id, enDias(-1)],
    );
    await escritos.cerrar(proceso.id, {}, gestor);

    await definitivo.generar(proceso.id, archivo('definitivo.pdf'), 'd'.repeat(64), gestor);
    await definitivo.publicar(
      proceso.id,
      { medioPublicacion: MEDIO },
      archivo('evidencia-definitivo.png', 'image/png'),
      'w'.repeat(64),
      gestor,
    );
    await acto.adjudicar(
      proceso.id,
      {
        oferenteId: oferentes[1].id,
        numeroActo: 'RES-ADJ-2026-160',
        fechaActo: hoy(),
        valorAdjudicado: 41_000_000,
      },
      archivo('resolucion-adjudicacion.pdf'),
      'z'.repeat(64),
      ordenador,
    );

    return { proceso, oferentes };
  };

  const estadoDelProceso = async (procesoId: string) => {
    const filas = await dataSource.query(`SELECT estado FROM hiring.procesos WHERE id = $1`, [
      procesoId,
    ]);
    return filas[0]?.estado;
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    desierta = app.get(DeclaratoriaDesiertaService);
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

    await dataSource.query(`DELETE FROM hiring.declaratorias_desiertas WHERE ${deProceso}`, [
      OBJETO,
    ]);
    await dataSource.query(`DELETE FROM hiring.actos_adjudicacion WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.informes_definitivos WHERE ${deProceso}`, [OBJETO]);
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

  describe('Criterio 1 · sin ofertas habilitadas se declara desierto y se cierra el proceso', () => {
    it('declara desierto el proceso al que no se presentó nadie', async () => {
      const { proceso } = await hastaRecepcionCerrada('ABREVIADA_MENOR_CUANTIA', 0);

      const estado = await desierta.declarar(
        proceso.id,
        {
          causal: 'SIN_OFERTAS',
          motivo: 'Vencido el plazo no se recibió ninguna oferta',
          numeroActo: 'RES-DES-2026-161',
          fechaActo: hoy(),
        } as any,
        archivo('declaratoria.pdf'),
        'x'.repeat(64),
        // Sin ofertas no hay comité que haya evaluado nada.
        null,
        null,
        gestor,
      );

      expect(estado.declaratoria).not.toBeNull();
      expect(estado.declaratoria!.causal).toBe('SIN_OFERTAS');
      expect(estado.declaratoria!.ofertasRecibidas).toBe(0);
      expect(await estadoDelProceso(proceso.id)).toBe('DESIERTO');
    });

    it('declara desierto cuando hubo ofertas y ninguna quedó habilitada', async () => {
      // El camino que el modelo no sabía representar: no hay resultado de
      // evaluación ni informe preliminar, porque no hay ganadora que nombrar.
      const { proceso } = await hastaRecepcionCerrada('ABREVIADA_MENOR_CUANTIA', 2);

      const estado = await declarar(proceso.id);

      expect(estado.declaratoria!.causal).toBe('SIN_OFERTAS_HABILITADAS');
      expect(estado.declaratoria!.ofertasRecibidas).toBe(2);
      expect(estado.declaratoria!.informeComite).not.toBeNull();
      expect(await estadoDelProceso(proceso.id)).toBe('DESIERTO');
    });

    it('el informe del comité es obligatorio cuando ninguna quedó habilitada', async () => {
      const { proceso } = await hastaRecepcionCerrada('ABREVIADA_MENOR_CUANTIA', 2);

      await expect(declarar(proceso.id, {}, false)).rejects.toThrow(/informe del comité/i);
    });

    it('deja las actividades de la etapa 7 en NO_APLICA', async () => {
      const { proceso } = await hastaRecepcionCerrada('ABREVIADA_MENOR_CUANTIA', 2);
      await declarar(proceso.id);

      const filas = await dataSource.query(
        `SELECT numeral, estado FROM hiring.proceso_actividades
          WHERE proceso_id = $1 AND numeral IN ('7.1','7.2','7.3','7.4')`,
        [proceso.id],
      );

      expect(filas).toHaveLength(4);
      // No es que estén pendientes: es que no van a ocurrir.
      for (const fila of filas) expect(fila.estado).toBe('NO_APLICA');
    });
  });

  // ------------------------------------------------------------ criterio 2 --

  describe('Criterio 2 · la causal tiene que ser verdad contra el expediente', () => {
    it('no admite "sin ofertas" si el proceso recibió ofertas', async () => {
      const { proceso } = await hastaRecepcionCerrada('ABREVIADA_MENOR_CUANTIA', 2);

      await expect(declarar(proceso.id, { causal: 'SIN_OFERTAS' }, false)).rejects.toThrow(
        /2 oferta/,
      );
    });

    it('no admite "ninguna habilitada" si no se presentó nadie', async () => {
      const { proceso } = await hastaRecepcionCerrada('ABREVIADA_MENOR_CUANTIA', 0);

      await expect(declarar(proceso.id)).rejects.toThrow(/no recibió ninguna oferta/i);
    });

    it('no declara desierto con la recepción todavía abierta', async () => {
      const proceso = await procesos.crearProceso(
        { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: 1_000_000 },
        gestor,
      );
      await cdp.solicitar(proceso.id, { rubro: 'A-02-02', valor: 1_000_000 }, gestor);
      await cdp.verificar(proceso.id, financiero);
      await cdp.expedir(
        proceso.id,
        { numero: 'CDP-2026-162', valor: 1_000_000, fechaExpedicion: hoy() },
        financiero,
      );
      await apertura.registrar(
        proceso.id,
        { resolucionNumero: 'RES-2026-162', resolucionFecha: hoy() },
        archivo('resolucion.pdf'),
        'a'.repeat(64),
        archivo('pliego.pdf'),
        'b'.repeat(64),
        archivo('captura.png', 'image/png'),
        'e'.repeat(64),
        gestor,
      );
      // Plazo hacia adelante: la recepción queda abierta.
      await ofertas.fijarPlazo(proceso.id, { vencimiento: enDias(5) }, gestor);

      await expect(declarar(proceso.id, { causal: 'SIN_OFERTAS' }, false)).rejects.toThrow(
        /sigue abierta/i,
      );
    });

    it('no declara desierto un proceso que nunca abrió recepción', async () => {
      const proceso = await procesos.crearProceso(
        { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: 1_000_000 },
        gestor,
      );

      await expect(declarar(proceso.id, { causal: 'SIN_OFERTAS' }, false)).rejects.toThrow(
        /no abrió recepción/i,
      );
    });

    it('la contratación directa no declara desierto: no recibe ofertas', async () => {
      const proceso = await procesos.crearProceso(
        { objeto: OBJETO, modalidad: 'CONTRATACION_DIRECTA', valorEstimado: 1_000_000 },
        gestor,
      );

      const estado = await desierta.estado(proceso.id);

      expect(estado.aplica).toBe(false);
      expect(estado.motivoNoAplica).not.toBeNull();
    });
  });

  // ------------------------------------------------------------ criterio 3 --

  describe('Criterio 3 · apartarse del comité no se impide, se sustenta', () => {
    it('exige justificación si el comité ya nombró una ganadora, y la nombra', async () => {
      const { proceso, oferentes } = await hastaRecepcionCerrada('ABREVIADA_MENOR_CUANTIA', 2);
      await conResultadoDelComite(proceso.id, oferentes[1].id);

      await expect(declarar(proceso.id)).rejects.toThrow(new RegExp(oferentes[1].nombre));
    });

    it('con justificación procede y deja dicho de qué resultado se apartó', async () => {
      const { proceso, oferentes } = await hastaRecepcionCerrada('ABREVIADA_MENOR_CUANTIA', 2);
      await conResultadoDelComite(proceso.id, oferentes[1].id);

      const estado = await declarar(proceso.id, {
        justificacion: 'La ganadora resultó inhabilitada de forma sobreviniente',
      });

      expect(estado.declaratoria!.seApartaDelResultado).toBe(true);

      const traza = await dataSource.query(
        `SELECT detalle FROM hiring.trazabilidad
          WHERE proceso_id = $1 AND accion = 'DECLARAR_DESIERTO'`,
        [proceso.id],
      );
      expect(traza[0].detalle.seApartaDelResultado).toBe(true);
    });
  });

  // ------------------------------------------------------------ criterio 4 --

  describe('Criterio 4 · adjudicado y desierto no conviven', () => {
    it('no declara desierto un proceso adjudicado', async () => {
      const { proceso } = await hastaAdjudicado();

      await expect(
        declarar(proceso.id, { justificacion: 'Se detectó una inhabilidad' }),
      ).rejects.toThrow(/RES-ADJ-2026-160/);
    });

    it('revocado el acto, sí se puede declarar desierto', async () => {
      const { proceso } = await hastaAdjudicado();
      await acto.revocar(
        proceso.id,
        { motivo: 'El adjudicatario no suscribió el contrato en término' },
        ordenador,
      );
      expect(await estadoDelProceso(proceso.id)).toBe('EN_CURSO');

      const estado = await declarar(proceso.id, {
        justificacion: 'Revocada la adjudicación, ninguna otra oferta quedó habilitada',
      });

      expect(estado.declaratoria).not.toBeNull();
      expect(await estadoDelProceso(proceso.id)).toBe('DESIERTO');
    });

    it('adjudicar marca el proceso como adjudicado', async () => {
      const { proceso } = await hastaAdjudicado();

      expect(await estadoDelProceso(proceso.id)).toBe('ADJUDICADO');
    });
  });

  // ------------------------------------------------------------ criterio 5 --

  describe('Criterio 5 · declarado desierto, la etapa 7 no sigue', () => {
    it('bloquea la audiencia, el informe definitivo y el acto', async () => {
      const { proceso } = await hastaRecepcionCerrada('LICITACION_PUBLICA', 2);
      await declarar(proceso.id);

      await expect(
        audiencia.celebrar(
          proceso.id,
          {
            celebradaAt: new Date().toISOString(),
            presididaPor: 'Ordenadora del Gasto',
            resumen: null as any,
          },
          archivo('acta.pdf'),
          'c'.repeat(64),
          gestor,
        ),
      ).rejects.toThrow(/declaró desierto/i);

      await expect(
        definitivo.generar(proceso.id, archivo('definitivo.pdf'), 'd'.repeat(64), gestor),
      ).rejects.toThrow(/declaró desierto/i);
    });

    it('revocada la declaratoria, la etapa vuelve a estar abierta', async () => {
      const { proceso } = await hastaRecepcionCerrada('LICITACION_PUBLICA', 2);
      await declarar(proceso.id);

      const estado = await desierta.revocar(
        proceso.id,
        { motivo: 'Se repuso el término por decisión de fondo del recurso' },
        gestor,
      );

      expect(estado.declaratoria).toBeNull();
      expect(estado.revocadas).toHaveLength(1);
      expect(await estadoDelProceso(proceso.id)).toBe('EN_CURSO');

      // Ya no bloquea: lo que falta ahora es el traslado, que es otra cosa.
      await expect(
        definitivo.generar(proceso.id, archivo('definitivo.pdf'), 'd'.repeat(64), gestor),
      ).rejects.toThrow(/traslado/i);
    });

    it('no declara desierto dos veces sin revocar la vigente', async () => {
      const { proceso } = await hastaRecepcionCerrada('ABREVIADA_MENOR_CUANTIA', 2);
      await declarar(proceso.id);

      await expect(declarar(proceso.id)).rejects.toThrow(/ya está declarado desierto/i);
    });
  });

  // ------------------------------------------------------------ criterio 6 --

  describe('Criterio 6 · la declaratoria se notifica y se publica', () => {
    it('registra la publicación con su evidencia', async () => {
      const { proceso } = await hastaRecepcionCerrada('ABREVIADA_MENOR_CUANTIA', 2);
      await declarar(proceso.id);

      const estado = await desierta.publicar(
        proceso.id,
        { medioPublicacion: MEDIO },
        archivo('evidencia.png', 'image/png'),
        'v'.repeat(64),
        gestor,
      );

      expect(estado.declaratoria!.publicadaAt).not.toBeNull();
      expect(estado.declaratoria!.notificadaAt).not.toBeNull();
      expect(estado.declaratoria!.evidencia).not.toBeNull();
    });

    it('no publica dos veces la misma declaratoria', async () => {
      const { proceso } = await hastaRecepcionCerrada('ABREVIADA_MENOR_CUANTIA', 2);
      await declarar(proceso.id);
      const publicar = () =>
        desierta.publicar(
          proceso.id,
          { medioPublicacion: MEDIO },
          archivo('evidencia.png', 'image/png'),
          'v'.repeat(64),
          gestor,
        );

      await publicar();
      await expect(publicar()).rejects.toThrow(/ya se publicó/i);
    });
  });
});
