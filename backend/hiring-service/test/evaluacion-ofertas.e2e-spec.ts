import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { EvaluacionService } from '../src/modules/evaluacion/evaluacion.service';
import { ComiteService } from '../src/modules/comite/comite.service';
import { OfertasService } from '../src/modules/ofertas/ofertas.service';
import { AperturaService } from '../src/modules/apertura/apertura.service';
import { CdpService } from '../src/modules/cdp/cdp.service';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { HiringAccess } from '../src/auth/hiring-access';

/**
 * HU EFDS-1157 · Evaluar ofertas (actividad 6.3).
 *
 * Lo que hay que comprobar contra la base es que la evaluación respete lo
 * construido antes: solo sobre una lista cerrada, solo con comité designado, y
 * solo por quien fue designado en esa dimensión. Esas tres condiciones viven en
 * tablas de las actividades 6.1 y 6.2, así que solo se ven punta a punta.
 */
describe('HU EFDS-1157 · evaluación de ofertas (actividad 6.3)', () => {
  let app: INestApplication;
  let evaluacion: EvaluacionService;
  let comite: ComiteService;
  let ofertas: OfertasService;
  let apertura: AperturaService;
  let cdp: CdpService;
  let procesos: EstudioPrevioService;
  let dataSource: DataSource;

  const OBJETO = 'Evaluación de ofertas para pruebas';

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

  /** Cuentas reales del directorio: el enlace persona-cuenta es de otro equipo. */
  let juridica: { acceso: HiringAccess; personaId: string };
  let tecnico: { acceso: HiringAccess; personaId: string };
  let financiera: { acceso: HiringAccess; personaId: string };

  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const haceHoras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const archivo = (nombre: string, mimetype = 'application/pdf') => ({
    filename: `${nombre}-en-disco`,
    originalname: nombre,
    mimetype,
    size: 1024,
  });

  /**
   * Selección abreviada de menor cuantía: el flujo arranca en la apertura, y
   * la matriz oficial (030) deja la mínima cuantía fuera de la 5.7 porque se
   * adjudica por comunicación de aceptación y no expide acto de apertura.
   */
  const crear = (modalidad = 'ABREVIADA_MENOR_CUANTIA') =>
    procesos.crearProceso({ objeto: OBJETO, modalidad, valorEstimado: 1_000_000 }, gestor);

  /** Proceso abierto, con dos ofertas y la recepción cerrada. */
  const conOfertasCerradas = async () => {
    const proceso = await crear();

    await cdp.solicitar(proceso.id, { rubro: 'A-02-02', valor: 1_000_000 }, gestor);
    await cdp.verificar(proceso.id, financiero);
    await cdp.expedir(
      proceso.id,
      { numero: 'CDP-2026-157', valor: 1_000_000, fechaExpedicion: hoy() },
      financiero,
    );
    await apertura.registrar(
      proceso.id,
      { resolucionNumero: 'RES-2026-157', resolucionFecha: hoy() },
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

    return { proceso, estado: await ofertas.cerrar(proceso.id, gestor) };
  };

  /** Designa el comité con las tres cuentas reales del directorio. */
  const designar = (procesoId: string) =>
    comite.designar(
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

  /** Los criterios de una dimensión, tal como los devuelve el estado. */
  const criteriosDe = async (procesoId: string, dimension: string) =>
    (await evaluacion.estado(procesoId, gestor)).criterios.filter((c) => c.dimension === dimension);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    evaluacion = app.get(EvaluacionService);
    comite = app.get(ComiteService);
    ofertas = app.get(OfertasService);
    apertura = app.get(AperturaService);
    cdp = app.get(CdpService);
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

    await dataSource.query(
      `DELETE FROM hiring.evaluacion_criterios WHERE evaluacion_id IN (SELECT id FROM hiring.evaluaciones_oferta WHERE oferente_id IN (${deOfertas}))`,
      [OBJETO],
    );
    await dataSource.query(
      `DELETE FROM hiring.evaluaciones_oferta WHERE oferente_id IN (${deOfertas})`,
      [OBJETO],
    );
    await dataSource.query(
      `DELETE FROM hiring.miembros_comite WHERE comite_id IN (SELECT id FROM hiring.comites_evaluadores WHERE ${deProceso})`,
      [OBJETO],
    );
    await dataSource.query(`DELETE FROM hiring.comites_evaluadores WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.oferentes WHERE id IN (${deOfertas})`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.recepciones_ofertas WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.cdp WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.procesos WHERE objeto = $1`, [OBJETO]);
    await app.close();
  });

  // ------------------------------------------------------------ criterio 1 --

  describe('Criterio 1 · cada evaluador registra lo suyo', () => {
    it('guarda la evaluación de una dimensión con todos sus criterios', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const criterios = await criteriosDe(proceso.id, 'JURIDICO');
      const oferta = estado.oferentes[0];

      const tras = await evaluacion.evaluar(
        proceso.id,
        oferta.id,
        {
          dimension: 'JURIDICO',
          resultados: criterios.map((c) => ({ criterioId: c.id, cumple: true })),
        },
        juridica.acceso,
      );

      const evaluada = tras.ofertas.find((o) => o.id === oferta.id);
      expect(evaluada!.evaluaciones).toHaveLength(1);
      expect(evaluada!.evaluaciones[0].dimension).toBe('JURIDICO');
      expect(evaluada!.evaluaciones[0].evaluadaPor).toBe('prueba.juridica');
    });

    it('reevaluar sustituye el juicio anterior, no lo acumula', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const criterios = await criteriosDe(proceso.id, 'JURIDICO');
      const oferta = estado.oferentes[0];
      const evaluar = (cumple: boolean) =>
        evaluacion.evaluar(
          proceso.id,
          oferta.id,
          {
            dimension: 'JURIDICO',
            resultados: criterios.map((c) => ({
              criterioId: c.id,
              cumple,
              observacion: cumple ? undefined : 'No aportó el certificado de existencia',
            })),
          },
          juridica.acceso,
        );

      await evaluar(true);
      const tras = await evaluar(false);

      const evaluada = tras.ofertas.find((o) => o.id === oferta.id);
      expect(evaluada!.evaluaciones).toHaveLength(1);
      expect(evaluada!.evaluaciones[0].resultados.every((r) => r.cumple === false)).toBe(true);
    });

    it('el estado dice en qué dimensiones puede calificar quien consulta', async () => {
      const { proceso } = await conOfertasCerradas();
      await designar(proceso.id);

      expect((await evaluacion.estado(proceso.id, juridica.acceso)).misDimensiones).toEqual([
        'JURIDICO',
      ]);
      // El gestor lleva el proceso pero no evalúa.
      expect((await evaluacion.estado(proceso.id, gestor)).misDimensiones).toEqual([]);
    });
  });

  // ------------------------------------------------------------ criterio 2 --

  describe('Criterio 2 · consolidación de habilitadas y calificación', () => {
    /** Evalúa una dimensión entera con el mismo veredicto para todo. */
    const evaluarTodo = async (
      procesoId: string,
      ofertaId: string,
      dimension: 'JURIDICO' | 'TECNICO' | 'FINANCIERO',
      quien: HiringAccess,
      opciones: { cumple?: boolean; puntajePleno?: boolean } = {},
    ) => {
      const { cumple = true, puntajePleno = true } = opciones;
      const criterios = await criteriosDe(procesoId, dimension);

      return evaluacion.evaluar(
        procesoId,
        ofertaId,
        {
          dimension,
          resultados: criterios.map((c) =>
            c.tipo === 'HABILITANTE'
              ? {
                  criterioId: c.id,
                  cumple,
                  observacion: cumple ? undefined : 'No acreditó lo exigido en el pliego',
                }
              : { criterioId: c.id, puntaje: puntajePleno ? c.puntajeMaximo! : 0 },
          ),
        },
        quien,
      );
    };

    it('habilita la oferta con todo cumplido y le calcula el puntaje económico', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const [barata, cara] = estado.oferentes;
      for (const oferta of [barata, cara]) {
        await evaluarTodo(proceso.id, oferta.id, 'JURIDICO', juridica.acceso);
        await evaluarTodo(proceso.id, oferta.id, 'TECNICO', tecnico.acceso);
        await evaluarTodo(proceso.id, oferta.id, 'FINANCIERO', financiera.acceso);
      }

      const tras = await evaluacion.estado(proceso.id, gestor);
      const laBarata = tras.ofertas.find((o) => o.id === barata.id)!.consolidado!;
      const laCara = tras.ofertas.find((o) => o.id === cara.id)!.consolidado!;

      expect(laBarata.estado).toBe('HABILITADA');
      expect(laCara.estado).toBe('HABILITADA');
      // 40 y 50 millones: la barata se lleva el máximo económico y la otra
      // baja en proporción, así que su total tiene que ser menor.
      expect(laBarata.puntajeTotal).toBeGreaterThan(laCara.puntajeTotal);
      expect(laBarata.puntajeTotal).toBe(laBarata.puntajeMaximo);
    });

    it('marca NO HABILITADA a la que incumple un habilitante y dice cuál', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const oferta = estado.oferentes[0];
      await evaluarTodo(proceso.id, oferta.id, 'JURIDICO', juridica.acceso, { cumple: false });
      await evaluarTodo(proceso.id, oferta.id, 'TECNICO', tecnico.acceso);
      await evaluarTodo(proceso.id, oferta.id, 'FINANCIERO', financiera.acceso);

      const tras = await evaluacion.estado(proceso.id, gestor);
      const consolidado = tras.ofertas.find((o) => o.id === oferta.id)!.consolidado!;

      expect(consolidado.estado).toBe('NO_HABILITADA');
      expect(consolidado.incumplimientos.length).toBeGreaterThan(0);
      expect(consolidado.incumplimientos[0].motivo).toMatch(/no acreditó/i);
    });

    it('deja pendiente la oferta a la que le falta una dimensión', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const oferta = estado.oferentes[0];
      await evaluarTodo(proceso.id, oferta.id, 'JURIDICO', juridica.acceso);

      const tras = await evaluacion.estado(proceso.id, gestor);
      const consolidado = tras.ofertas.find((o) => o.id === oferta.id)!.consolidado!;

      expect(consolidado.estado).toBe('PENDIENTE');
      expect(consolidado.dimensionesPendientes).toContain('TECNICO');
    });

    it('la consolidación sigue a la evaluación cuando se corrige', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const oferta = estado.oferentes[0];
      await evaluarTodo(proceso.id, oferta.id, 'TECNICO', tecnico.acceso);
      await evaluarTodo(proceso.id, oferta.id, 'FINANCIERO', financiera.acceso);
      await evaluarTodo(proceso.id, oferta.id, 'JURIDICO', juridica.acceso, { cumple: false });

      const fuera = (await evaluacion.estado(proceso.id, gestor)).ofertas.find(
        (o) => o.id === oferta.id,
      )!.consolidado!;
      expect(fuera.estado).toBe('NO_HABILITADA');

      // Se corrige el juicio jurídico: no hay que rehacer nada más, porque el
      // consolidado se calcula al consultarlo.
      await evaluarTodo(proceso.id, oferta.id, 'JURIDICO', juridica.acceso, { cumple: true });

      const dentro = (await evaluacion.estado(proceso.id, gestor)).ofertas.find(
        (o) => o.id === oferta.id,
      )!.consolidado!;
      expect(dentro.estado).toBe('HABILITADA');
      expect(dentro.incumplimientos).toHaveLength(0);
    });
  });

  // ------------------------------------------------------- quién y cuándo --

  describe('Solo evalúa quien fue designado, y solo lo suyo', () => {
    it('rechaza a quien no está en el comité de este proceso', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const criterios = await criteriosDe(proceso.id, 'JURIDICO');

      await expect(
        evaluacion.evaluar(
          proceso.id,
          estado.oferentes[0].id,
          {
            dimension: 'JURIDICO',
            resultados: criterios.map((c) => ({ criterioId: c.id, cumple: true })),
          },
          gestor,
        ),
      ).rejects.toThrow(/no fuiste designado/i);
    });

    it('rechaza al evaluador que se sale de su dimensión', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const criterios = await criteriosDe(proceso.id, 'JURIDICO');

      // El técnico está designado, pero no para lo jurídico.
      await expect(
        evaluacion.evaluar(
          proceso.id,
          estado.oferentes[0].id,
          {
            dimension: 'JURIDICO',
            resultados: criterios.map((c) => ({ criterioId: c.id, cumple: true })),
          },
          tecnico.acceso,
        ),
      ).rejects.toThrow(/no para la juridico/i);
    });

    it('no deja evaluar sin comité designado', async () => {
      const { proceso, estado } = await conOfertasCerradas();

      const criterios = await criteriosDe(proceso.id, 'JURIDICO');

      await expect(
        evaluacion.evaluar(
          proceso.id,
          estado.oferentes[0].id,
          {
            dimension: 'JURIDICO',
            resultados: criterios.map((c) => ({ criterioId: c.id, cumple: true })),
          },
          juridica.acceso,
        ),
      ).rejects.toThrow(/no tiene comité evaluador designado/i);
    });
  });

  // ------------------------------------------------- forma de la evaluación --

  describe('El juicio cubre la dimensión y respeta el tipo del criterio', () => {
    it('exige todos los criterios de la dimensión', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const criterios = await criteriosDe(proceso.id, 'TECNICO');
      expect(criterios.length).toBeGreaterThan(1);

      // Falta uno: media evaluación se leería como criterios incumplidos.
      await expect(
        evaluacion.evaluar(
          proceso.id,
          estado.oferentes[0].id,
          {
            dimension: 'TECNICO',
            resultados: [
              criterios[0].tipo === 'HABILITANTE'
                ? { criterioId: criterios[0].id, cumple: true }
                : { criterioId: criterios[0].id, puntaje: 1 },
            ],
          },
          tecnico.acceso,
        ),
      ).rejects.toThrow(/falta calificar/i);
    });

    it('no admite puntaje en un habilitante ni "cumple" en un ponderable', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const criterios = await criteriosDe(proceso.id, 'TECNICO');
      const habilitante = criterios.find((c) => c.tipo === 'HABILITANTE')!;
      const ponderable = criterios.find((c) => c.tipo === 'PONDERABLE')!;

      await expect(
        evaluacion.evaluar(
          proceso.id,
          estado.oferentes[0].id,
          {
            dimension: 'TECNICO',
            resultados: criterios.map((c) =>
              c.id === habilitante.id
                ? { criterioId: c.id, puntaje: 5 }
                : { criterioId: c.id, puntaje: 1 },
            ),
          },
          tecnico.acceso,
        ),
      ).rejects.toThrow(/habilitante/i);

      await expect(
        evaluacion.evaluar(
          proceso.id,
          estado.oferentes[0].id,
          {
            dimension: 'TECNICO',
            resultados: criterios.map((c) =>
              c.id === ponderable.id
                ? { criterioId: c.id, cumple: true }
                : { criterioId: c.id, cumple: true },
            ),
          },
          tecnico.acceso,
        ),
      ).rejects.toThrow(/ponderable/i);
    });

    it('no deja pasar un puntaje por encima del máximo del criterio', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const criterios = await criteriosDe(proceso.id, 'TECNICO');
      const ponderable = criterios.find((c) => c.tipo === 'PONDERABLE')!;

      await expect(
        evaluacion.evaluar(
          proceso.id,
          estado.oferentes[0].id,
          {
            dimension: 'TECNICO',
            resultados: criterios.map((c) =>
              c.tipo === 'HABILITANTE'
                ? { criterioId: c.id, cumple: true }
                : {
                    criterioId: c.id,
                    puntaje: c.id === ponderable.id ? ponderable.puntajeMaximo! + 1 : 0,
                  },
            ),
          },
          tecnico.acceso,
        ),
      ).rejects.toThrow(/admite hasta/i);
    });

    it('exige el motivo cuando un habilitante no se cumple', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const criterios = await criteriosDe(proceso.id, 'JURIDICO');

      await expect(
        evaluacion.evaluar(
          proceso.id,
          estado.oferentes[0].id,
          {
            dimension: 'JURIDICO',
            resultados: criterios.map((c) => ({ criterioId: c.id, cumple: false })),
          },
          juridica.acceso,
        ),
      ).rejects.toThrow(/explica por qué/i);
    });

    it('no deja registrar a mano la dimensión económica', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      await expect(
        evaluacion.evaluar(
          proceso.id,
          estado.oferentes[0].id,
          // El DTO ya la rechaza; el servicio también, porque la regla es suya
          // y no de la forma de la petición.
          { dimension: 'ECONOMICO' as any, resultados: [{ criterioId: estado.oferentes[0].id }] },
          juridica.acceso,
        ),
      ).rejects.toThrow(/se calcula sobre el valor ofertado/i);
    });
  });
});
