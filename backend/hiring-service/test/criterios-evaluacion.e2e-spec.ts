import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { CriteriosService } from '../src/modules/evaluacion/criterios.service';
import { EvaluacionService } from '../src/modules/evaluacion/evaluacion.service';
import { ComiteService } from '../src/modules/comite/comite.service';
import { OfertasService } from '../src/modules/ofertas/ofertas.service';
import { AperturaService } from '../src/modules/apertura/apertura.service';
import { CdpService } from '../src/modules/cdp/cdp.service';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { HiringAccess } from '../src/auth/hiring-access';

/**
 * EFDS-1443 · Administrar los criterios de evaluación desde la aplicación.
 *
 * Lo que hay que comprobar contra la base es que el catálogo se pueda corregir
 * sin desplegar y que corregirlo no rompa lo ya evaluado: quién puede escribir,
 * qué combinaciones rechaza, y qué pasa con un criterio que ya se usó para
 * calificar una oferta. Eso último solo se ve punta a punta.
 */
describe('EFDS-1443 · catálogo de criterios de evaluación', () => {
  let app: INestApplication;
  let criterios: CriteriosService;
  let evaluacion: EvaluacionService;
  let comite: ComiteService;
  let ofertas: OfertasService;
  let apertura: AperturaService;
  let cdp: CdpService;
  let procesos: EstudioPrevioService;
  let dataSource: DataSource;

  const OBJETO = 'Catálogo de criterios para pruebas';
  /** Todo lo que cree la prueba lleva este prefijo, y por ahí se limpia. */
  const PREFIJO = 'PRUEBA-1443';
  /**
   * Los criterios que crea esta prueba van todos en una modalidad que ninguna
   * otra suite usa.
   *
   * Un criterio sin modalidad aplica a todas, así que se colaría en las
   * evaluaciones de las demás pruebas mientras corren en paralelo: cambiaría lo
   * que ellas califican, y sus evaluaciones impedirían borrarlo al terminar.
   */
  const MODALIDAD_AISLADA = 'CONCURSO_MERITOS_PRECAL';

  const director: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000004',
    userName: 'prueba.director',
    roles: ['DIRECTOR_CONTRATACION'],
    puedeEditar: false,
  };
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

  /** Cuenta real del directorio: el enlace persona-cuenta es de otro equipo. */
  let juridica: { acceso: HiringAccess; personaId: string };

  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const haceHoras = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString();
  const archivo = (nombre: string, mimetype = 'application/pdf') => ({
    filename: `${nombre}-en-disco`,
    originalname: nombre,
    mimetype,
    size: 1024,
  });

  const delCatalogo = async (id: string) =>
    (await criterios.catalogo(director)).criterios.find((c) => c.id === id)!;

  /** Un proceso con una oferta y el comité designado, listo para evaluar. */
  const conOfertaYComite = async () => {
    const proceso = await procesos.crearProceso(
      { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: 1_000_000 },
      gestor,
    );

    await cdp.solicitar(proceso.id, { rubro: 'A-02-02', valor: 1_000_000 }, gestor);
    await cdp.verificar(proceso.id, financiero);
    await cdp.expedir(
      proceso.id,
      { numero: 'CDP-2026-443', valor: 1_000_000, fechaExpedicion: hoy() },
      financiero,
    );
    await apertura.registrar(
      proceso.id,
      { resolucionNumero: 'RES-2026-443', resolucionFecha: hoy() },
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
        nombre: 'Oferente de prueba',
        identificacion: '900443443-4',
        fechaRadicacion: haceHoras(4),
        valorOfertado: 40_000_000,
      },
      archivo('oferta.pdf'),
      'o'.repeat(64),
      gestor,
    );
    const estado = await ofertas.cerrar(proceso.id, gestor);

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

    return { proceso, oferta: estado.oferentes[0] };
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    criterios = app.get(CriteriosService);
    evaluacion = app.get(EvaluacionService);
    comite = app.get(ComiteService);
    ofertas = app.get(OfertasService);
    apertura = app.get(AperturaService);
    cdp = app.get(CdpService);
    procesos = app.get(EstudioPrevioService);
    dataSource = app.get(DataSource);

    // Una corrida anterior interrumpida deja criterios con estos nombres, y
    // buscarlos por nombre encontraría dos.
    await dataSource.query(`DELETE FROM hiring.criterios_evaluacion WHERE nombre LIKE $1`, [
      `${PREFIJO}%`,
    ]);

    const cuentas = await dataSource.query(
      `SELECT id_user, id_person FROM auth."user" WHERE id_person IS NOT NULL ORDER BY id_user LIMIT 1`,
    );
    expect(cuentas).toHaveLength(1);

    juridica = {
      personaId: cuentas[0].id_person,
      acceso: {
        userId: cuentas[0].id_user,
        userName: 'prueba.juridica',
        roles: ['EVALUADOR_JURIDICO'],
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
    // Los criterios van al final: las evaluaciones que los usaban ya no están.
    await dataSource.query(`DELETE FROM hiring.criterios_evaluacion WHERE nombre LIKE $1`, [
      `${PREFIJO}%`,
    ]);
    await app.close();
  });

  // ----------------------------------------------------------- el catálogo --

  describe('El catálogo se lee entero, con lo que falta por confirmar', () => {
    it('devuelve los criterios sembrados, su tipo y su puntaje', async () => {
      const catalogo = await criterios.catalogo(director);

      expect(catalogo.criterios.length).toBeGreaterThan(0);
      expect(catalogo.dimensiones).toHaveLength(4);
      // La económica se calcula sobre el precio: la pantalla tiene que poder
      // decirlo en vez de ofrecer un formulario para calificarla a mano.
      expect(catalogo.dimensiones.find((d) => d.codigo === 'ECONOMICO')!.calculada).toBe(true);

      const habilitantes = catalogo.criterios.filter((c) => c.tipo === 'HABILITANTE');
      expect(habilitantes.every((c) => c.puntajeMaximo === null)).toBe(true);

      const ponderables = catalogo.criterios.filter((c) => c.tipo === 'PONDERABLE');
      expect(ponderables.every((c) => (c.puntajeMaximo ?? 0) > 0)).toBe(true);
    });

    it('advierte que hay criterios sin confirmar y dice cuánto suma cada modalidad', async () => {
      const catalogo = await criterios.catalogo(director);

      // Los sembrados son supuesto del equipo: nadie los ha ratificado.
      expect(catalogo.haySinConfirmar).toBe(true);
      expect(catalogo.totales.length).toBeGreaterThan(0);
      expect(catalogo.totales.every((t) => t.total > 0)).toBe(true);
    });

    it('deja escribir a la Dirección de Contratación y no al gestor', async () => {
      expect((await criterios.catalogo(director)).puedeEditar).toBe(true);
      // El gestor lleva el proceso, pero no fija la regla con la que se evalúa.
      expect((await criterios.catalogo(gestor)).puedeEditar).toBe(false);
    });
  });

  // ------------------------------------------------- crear, corregir, retirar

  describe('El catálogo se corrige sin desplegar', () => {
    it('agrega un ponderable propio de una modalidad', async () => {
      const catalogo = await criterios.crear(
        {
          modalidad: MODALIDAD_AISLADA,
          dimension: 'TECNICO',
          tipo: 'PONDERABLE',
          nombre: `${PREFIJO} · Personal ofrecido`,
          puntajeMaximo: 15,
          orden: 900,
          fundamento: 'Pliego de la modalidad',
        },
        director,
      );

      const creado = catalogo.criterios.find((c) => c.nombre.startsWith(PREFIJO))!;
      expect(creado.puntajeMaximo).toBe(15);
      expect(creado.modalidadNombre).not.toBeNull();
      // Nace sin confirmar aunque lo cree quien puede confirmarlo: son dos
      // actos distintos, redactar y ratificar.
      expect(creado.confirmado).toBe(false);
      expect(creado.evaluacionesQueLoUsan).toBe(0);
    });

    it('rechaza un ponderable sin puntaje y un habilitante con puntaje', async () => {
      await expect(
        criterios.crear(
          {
            modalidad: MODALIDAD_AISLADA,
            dimension: 'TECNICO',
            tipo: 'PONDERABLE',
            nombre: `${PREFIJO} · Ponderable sin peso`,
          },
          director,
        ),
      ).rejects.toThrow(/necesita puntaje máximo/i);

      await expect(
        criterios.crear(
          {
            modalidad: MODALIDAD_AISLADA,
            dimension: 'JURIDICO',
            tipo: 'HABILITANTE',
            nombre: `${PREFIJO} · Habilitante con peso`,
            puntajeMaximo: 10,
          },
          director,
        ),
      ).rejects.toThrow(/no lleva puntaje/i);
    });

    it('corregir el puntaje deja el criterio sin confirmar', async () => {
      const creado = (
        await criterios.crear(
          {
            modalidad: MODALIDAD_AISLADA,
            dimension: 'FINANCIERO',
            tipo: 'PONDERABLE',
            nombre: `${PREFIJO} · Capacidad financiera adicional`,
            puntajeMaximo: 10,
            confirmado: true,
          },
          director,
        )
      ).criterios.find((c) => c.nombre.endsWith('Capacidad financiera adicional'))!;

      expect(creado.confirmado).toBe(true);

      await criterios.actualizar(creado.id, { puntajeMaximo: 20 }, director);
      const tras = await delCatalogo(creado.id);

      expect(tras.puntajeMaximo).toBe(20);
      // La ratificación era sobre una cifra concreta, no sobre la fila.
      expect(tras.confirmado).toBe(false);
    });

    it('marcar confirmado es una edición en pantalla, no una migración', async () => {
      const creado = (
        await criterios.crear(
          {
            modalidad: MODALIDAD_AISLADA,
            dimension: 'JURIDICO',
            tipo: 'HABILITANTE',
            nombre: `${PREFIJO} · Documentos habilitantes del pliego`,
          },
          director,
        )
      ).criterios.find((c) => c.nombre.endsWith('Documentos habilitantes del pliego'))!;

      await criterios.actualizar(
        creado.id,
        { confirmado: true, fundamento: 'Ratificado en mesa de trabajo' },
        director,
      );

      const tras = await delCatalogo(creado.id);
      expect(tras.confirmado).toBe(true);
      expect(tras.fundamento).toMatch(/ratificado/i);
    });

    it('desactivar retira el criterio de las evaluaciones nuevas sin borrarlo', async () => {
      const creado = (
        await criterios.crear(
          {
            modalidad: MODALIDAD_AISLADA,
            dimension: 'TECNICO',
            tipo: 'PONDERABLE',
            nombre: `${PREFIJO} · Criterio que se retira`,
            puntajeMaximo: 5,
          },
          director,
        )
      ).criterios.find((c) => c.nombre.endsWith('Criterio que se retira'))!;

      const tras = await criterios.cambiarActivo(creado.id, { activo: false }, director);
      const retirado = tras.criterios.find((c) => c.id === creado.id)!;

      // Sigue en el catálogo: es lo que explica una evaluación vieja con un
      // renglón que ya no aparece en las nuevas.
      expect(retirado).toBeDefined();
      expect(retirado.activo).toBe(false);
      expect(tras.totales.every((t) => t.total >= 0)).toBe(true);

      await expect(
        criterios.cambiarActivo(creado.id, { activo: false }, director),
      ).rejects.toThrow(/ya está desactivado/i);
    });
  });

  // --------------------------------------------- lo que ya se usó para evaluar

  describe('Un criterio ya usado para calificar', () => {
    it('no cambia de dimensión ni de tipo, y dice en cuántas evaluaciones está', async () => {
      const { proceso, oferta } = await conOfertaYComite();

      const juridicos = (await evaluacion.estado(proceso.id, gestor)).criterios.filter(
        (c) => c.dimension === 'JURIDICO',
      );
      expect(juridicos.length).toBeGreaterThan(0);

      await evaluacion.evaluar(
        proceso.id,
        oferta.id,
        {
          dimension: 'JURIDICO',
          resultados: juridicos.map((c) => ({ criterioId: c.id, cumple: true })),
        },
        juridica.acceso,
      );

      const usado = await delCatalogo(juridicos[0].id);
      expect(usado.evaluacionesQueLoUsan).toBeGreaterThan(0);

      await expect(
        criterios.actualizar(usado.id, { tipo: 'PONDERABLE', puntajeMaximo: 10 }, director),
      ).rejects.toThrow(/no cambiar de dimensión ni de tipo/i);

      // Corregir el texto sí: es lo que se hace cuando el nombre quedó mal
      // transcrito del pliego.
      await criterios.actualizar(usado.id, { descripcion: 'Redacción corregida' }, director);
      expect((await delCatalogo(usado.id)).descripcion).toBe('Redacción corregida');
    });
  });
});
