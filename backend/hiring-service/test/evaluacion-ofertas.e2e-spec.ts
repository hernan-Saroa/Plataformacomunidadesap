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
 * La evaluación se hace **por fuera** de la plataforma: el comité califica con
 * sus formatos, elige la ganadora y aquí solo registra el resultado con su
 * informe. Lo que hay que comprobar contra la base, entonces, no es ninguna
 * cuenta —no hay ninguna— sino que el registro sea creíble: lista cerrada,
 * comité designado, quien registra designado en ese comité, ganadora de entre
 * las ofertas recibidas e informe adjunto. Esas condiciones viven en tablas de
 * las actividades 6.1 y 6.2, así que solo se ven punta a punta.
 */
describe('HU EFDS-1157 · resultado de la evaluación (actividad 6.3)', () => {
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
  const enHoras = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
  const archivo = (nombre: string, mimetype = 'application/pdf') => ({
    filename: `${nombre}-en-disco`,
    originalname: nombre,
    mimetype,
    size: 1024,
    path: `/tmp/${nombre}`,
  });

  const JUSTIFICACION =
    'Cumplió los requisitos habilitantes y obtuvo el mayor puntaje del comité evaluador.';

  /**
   * Selección abreviada de menor cuantía: el flujo arranca en la apertura, y
   * la matriz oficial (030) deja la mínima cuantía fuera de la 5.7 porque se
   * adjudica por comunicación de aceptación y no expide acto de apertura.
   */
  const crear = (modalidad = 'ABREVIADA_MENOR_CUANTIA') =>
    procesos.crearProceso({ objeto: OBJETO, modalidad, valorEstimado: 1_000_000 }, gestor);

  /** Proceso abierto con dos ofertas registradas; la recepción sigue viva. */
  const conOfertas = async (vencimiento: string) => {
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

    await ofertas.fijarPlazo(proceso.id, { vencimiento }, gestor);
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

    return proceso;
  };

  /** Proceso con dos ofertas y la recepción ya cerrada. */
  const conOfertasCerradas = async () => {
    const proceso = await conOfertas(haceHoras(3));
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

  /** El registro típico: gana la primera oferta, con nota sobre 100. */
  const registrar = (
    procesoId: string,
    oferenteId: string,
    quien: HiringAccess,
    datos: Partial<{
      puntajeObtenido: number;
      puntajeMaximo: number;
      valorEvaluado: number;
      justificacion: string;
    }> = {},
  ) =>
    evaluacion.registrar(
      procesoId,
      {
        oferenteId,
        puntajeObtenido: 92.5,
        puntajeMaximo: 100,
        justificacion: JUSTIFICACION,
        ...datos,
      },
      archivo('informe-evaluacion.pdf'),
      'i'.repeat(64),
      quien,
    );

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
    await dataSource.query(`DELETE FROM hiring.cdp WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.procesos WHERE objeto = $1`, [OBJETO]);
    await app.close();
  });

  // ------------------------------------------------------------ criterio 1 --

  describe('Criterio 1 · la plataforma recibe el resultado, no lo calcula', () => {
    it('registra la ganadora con su valoración y el informe del comité', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const ganadora = estado.oferentes[0];
      const tras = await registrar(proceso.id, ganadora.id, juridica.acceso);

      expect(tras.resultado).not.toBeNull();
      expect(tras.resultado!.ganadora!.id).toBe(ganadora.id);
      expect(tras.resultado!.puntajeObtenido).toBe(92.5);
      expect(tras.resultado!.puntajeMaximo).toBe(100);
      expect(tras.resultado!.justificacion).toBe(JUSTIFICACION);
      expect(tras.resultado!.informe).not.toBeNull();
      expect(tras.resultado!.registradoPor).toBe('prueba.juridica');
      // Sin corrección aritmética, el valor evaluado es el que la oferta trajo.
      expect(tras.resultado!.valorEvaluado).toBe(40_000_000);
    });

    it('deja al comité corregir aritméticamente el valor de la oferta', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const tras = await registrar(proceso.id, estado.oferentes[0].id, tecnico.acceso, {
        valorEvaluado: 39_500_000,
      });

      expect(tras.resultado!.valorEvaluado).toBe(39_500_000);
      // La oferta sigue diciendo lo que el oferente presentó.
      expect(tras.resultado!.ganadora!.valorOfertado).toBe(40_000_000);
    });

    it('admite un resultado sin puntaje: no toda modalidad puntúa', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const tras = await evaluacion.registrar(
        proceso.id,
        { oferenteId: estado.oferentes[0].id, justificacion: JUSTIFICACION },
        archivo('informe-evaluacion.pdf'),
        'i'.repeat(64),
        financiera.acceso,
      );

      expect(tras.resultado!.puntajeObtenido).toBeNull();
      expect(tras.resultado!.puntajeMaximo).toBeNull();
    });

    it('da la actividad 6.3 por cumplida al registrar el resultado', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);
      await registrar(proceso.id, estado.oferentes[0].id, juridica.acceso);

      const [actividad] = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '6.3'`,
        [proceso.id],
      );
      expect(actividad.estado).toBe('APROBADO');
    });
  });

  // ------------------------------------------------------------ criterio 2 --

  describe('Criterio 2 · quién puede registrarlo y sobre qué', () => {
    it('lo registra quien integra el comité, no quien lleva el proceso', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      // El gestor lleva el proceso pero no evaluó: no responde por el resultado.
      await expect(registrar(proceso.id, estado.oferentes[0].id, gestor)).rejects.toThrow(
        /no fuiste designado en el comité/i,
      );

      const visto = await evaluacion.estado(proceso.id, gestor);
      expect(visto.esMiembroDelComite).toBe(false);
      expect(visto.puedeRegistrar).toBe(false);
    });

    it('no lo registra un evaluador designado en otro proceso', async () => {
      const otro = await conOfertasCerradas();
      await designar(otro.proceso.id);

      // Este proceso tiene su propio comité, sin la evaluadora jurídica.
      const { proceso, estado } = await conOfertasCerradas();
      await comite.designar(
        proceso.id,
        {
          fechaDesignacion: hoy(),
          miembros: [{ personaId: tecnico.personaId, nombre: 'Evaluador técnico', rol: 'TECNICO' }],
        },
        archivo('memorando.pdf'),
        'm'.repeat(64),
        ordenador,
      );

      await expect(registrar(proceso.id, estado.oferentes[0].id, juridica.acceso)).rejects.toThrow(
        /no fuiste designado en el comité/i,
      );
    });

    it('no registra resultado sin comité designado', async () => {
      const { proceso, estado } = await conOfertasCerradas();

      await expect(registrar(proceso.id, estado.oferentes[0].id, juridica.acceso)).rejects.toThrow(
        /no tiene comité evaluador designado/i,
      );
    });

    it('no registra resultado mientras la recepción siga abierta', async () => {
      // Sin cerrar no hay comité que designar, así que el reclamo por la
      // recepción abierta tiene que llegar antes que el del comité.
      const proceso = await conOfertas(enHoras(48));
      const abiertas = await ofertas.estado(proceso.id);

      await expect(
        registrar(proceso.id, abiertas.oferentes[0].id, juridica.acceso),
      ).rejects.toThrow(/sigue abierta/i);
    });

    it('la ganadora tiene que ser una de las ofertas del proceso', async () => {
      const ajeno = await conOfertasCerradas();
      const { proceso } = await conOfertasCerradas();
      await designar(proceso.id);

      await expect(
        registrar(proceso.id, ajeno.estado.oferentes[0].id, juridica.acceso),
      ).rejects.toThrow(/no está en la lista de este proceso/i);
    });

    it('el puntaje va con su escala y no la supera', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      await expect(
        registrar(proceso.id, estado.oferentes[0].id, juridica.acceso, {
          puntajeMaximo: undefined,
        }),
      ).rejects.toThrow(/va con su escala/i);

      await expect(
        registrar(proceso.id, estado.oferentes[0].id, juridica.acceso, {
          puntajeObtenido: 120,
          puntajeMaximo: 100,
        }),
      ).rejects.toThrow(/no puede superar el máximo/i);
    });
  });

  // ------------------------------------------------------------ criterio 3 --

  describe('Criterio 3 · un solo resultado vigente, con sus evidencias', () => {
    it('no admite un segundo resultado sin rectificar el anterior', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);
      await registrar(proceso.id, estado.oferentes[0].id, juridica.acceso);

      await expect(registrar(proceso.id, estado.oferentes[1].id, tecnico.acceso)).rejects.toThrow(
        /ya tiene resultado registrado/i,
      );
    });

    it('rectificar conserva el anterior y deja registrar otro', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);
      await registrar(proceso.id, estado.oferentes[0].id, juridica.acceso);

      const rectificado = await evaluacion.rectificar(
        proceso.id,
        { motivo: 'El comité corrigió la verificación financiera de la primera oferta' },
        juridica.acceso,
      );

      expect(rectificado.resultado).toBeNull();
      expect(rectificado.rectificados).toHaveLength(1);
      expect(rectificado.rectificados[0].motivoRectificacion).toMatch(/corrigió/i);

      // Y la actividad vuelve a quedar en curso: el proceso se quedó sin
      // resultado hasta que se registre el nuevo.
      const [actividad] = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '6.3'`,
        [proceso.id],
      );
      expect(actividad.estado).toBe('BORRADOR');

      const tras = await registrar(proceso.id, estado.oferentes[1].id, tecnico.acceso);
      expect(tras.resultado!.ganadora!.id).toBe(estado.oferentes[1].id);
      expect(tras.rectificados).toHaveLength(1);
    });

    it('las evidencias se cargan sobre un resultado ya registrado', async () => {
      const { proceso, estado } = await conOfertasCerradas();
      await designar(proceso.id);

      const evidencia = (descripcion: string, quien: HiringAccess) =>
        evaluacion.agregarEvidencia(
          proceso.id,
          { descripcion },
          archivo('verificacion.pdf'),
          'v'.repeat(64),
          quien,
        );

      await expect(evidencia('Verificación jurídica', juridica.acceso)).rejects.toThrow(
        /primero se registra el resultado/i,
      );

      await registrar(proceso.id, estado.oferentes[0].id, juridica.acceso);
      await evidencia('Verificación jurídica', juridica.acceso);
      const tras = await evidencia('Cuadro comparativo', tecnico.acceso);

      expect(tras.resultado!.evidencias).toHaveLength(2);
      expect(tras.resultado!.evidencias.map((e) => e.descripcion)).toEqual([
        'Verificación jurídica',
        'Cuadro comparativo',
      ]);
      expect(tras.resultado!.evidencias[1].cargadaPor).toBe('prueba.tecnico');
    });
  });
});
