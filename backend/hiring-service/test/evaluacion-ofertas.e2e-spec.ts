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
  };
  const financiero: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000002',
    userName: 'prueba.financiero',
    roles: ['ESTRUCTURADOR_FINANCIERO'],
  };
  const ordenador: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000003',
    userName: 'prueba.ordenador',
    roles: ['ORDENADOR_GASTO'],
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

    await cdp.cargar(
      proceso.id,
      { rubro: 'A-02-02', numero: 'CDP-2026-157', valor: 1_000_000, fechaExpedicion: hoy() },
      null,
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

  /** El registro típico: el informe preliminar en un solo archivo, sin ganadora. */
  const registrar = (
    procesoId: string,
    quien: HiringAccess,
    datos: Partial<{ observacion: string; dimensiones: any[] }> = {},
    archivos = [archivo('informe-evaluacion.pdf')],
  ) =>
    evaluacion.registrar(
      procesoId,
      datos,
      archivos.map((a, n) => ({ archivo: a, hash: String(n).repeat(64) })),
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
      },
    };
    tecnico = {
      personaId: cuentas[1].id_person,
      acceso: {
        userId: cuentas[1].id_user,
        userName: 'prueba.tecnico',
        roles: ['EVALUADOR_TECNICO'],
      },
    };
    financiera = {
      personaId: cuentas[2].id_person,
      acceso: {
        userId: cuentas[2].id_user,
        userName: 'prueba.financiera',
        roles: ['EVALUADOR_FINANCIERO'],
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

  describe('Criterio 1 · la evaluación preliminar es un informe, sin puntajes ni ganadora', () => {
    it('carga el informe del comité sin nombrar ganadora (QA, EFDS-1157)', async () => {
      const { proceso } = await conOfertasCerradas();
      await designar(proceso.id);

      const tras = await registrar(proceso.id, juridica.acceso, { observacion: JUSTIFICACION });

      expect(tras.resultado).not.toBeNull();
      expect(tras.resultado!.ganadora).toBeNull();
      expect(tras.resultado!.puntajeObtenido).toBeNull();
      expect(tras.resultado!.valorEvaluado).toBeNull();
      expect(tras.resultado!.justificacion).toBe(JUSTIFICACION);
      expect(tras.resultado!.informe).not.toBeNull();
      expect(tras.resultado!.registradoPor).toBe('prueba.juridica');
    });

    it('acepta el informe en varios archivos, uno por dimensión', async () => {
      const { proceso } = await conOfertasCerradas();
      await designar(proceso.id);

      const tras = await registrar(
        proceso.id,
        juridica.acceso,
        { dimensiones: ['JURIDICO', 'TECNICO', 'FINANCIERO'] },
        [archivo('juridico.pdf'), archivo('tecnico.pdf'), archivo('financiero.xlsx')],
      );

      expect(tras.resultado!.evidencias.map((e) => e.descripcion)).toEqual([
        'Evaluación jurídica',
        'Evaluación técnica',
        'Evaluación financiera y económica',
      ]);
    });

    it('pide una dimensión por archivo si las dice', async () => {
      const { proceso } = await conOfertasCerradas();
      await designar(proceso.id);

      await expect(
        registrar(proceso.id, juridica.acceso, { dimensiones: ['JURIDICO'] }, [
          archivo('a.pdf'),
          archivo('b.pdf'),
        ]),
      ).rejects.toThrow(/una dimensión por archivo/i);
    });

    it('da la actividad 6.3 por cumplida al cargar el informe', async () => {
      const { proceso } = await conOfertasCerradas();
      await designar(proceso.id);
      await registrar(proceso.id, juridica.acceso);

      const [actividad] = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '6.3'`,
        [proceso.id],
      );
      expect(actividad.estado).toBe('APROBADO');
    });
  });

  // ------------------------------------------------------------ criterio 2 --

  describe('Criterio 2 · quién puede cargarlo y sobre qué', () => {
    it('lo carga quien integra el comité, no quien lleva el proceso', async () => {
      const { proceso } = await conOfertasCerradas();
      await designar(proceso.id);

      // El gestor lleva el proceso pero no evaluó: no responde por el informe.
      await expect(registrar(proceso.id, gestor)).rejects.toThrow(/no fuiste designado en el comité/i);

      const visto = await evaluacion.estado(proceso.id, gestor);
      expect(visto.esMiembroDelComite).toBe(false);
      expect(visto.puedeRegistrar).toBe(false);
    });

    it('no lo carga un evaluador designado en otro proceso', async () => {
      const otro = await conOfertasCerradas();
      await designar(otro.proceso.id);

      // Este proceso tiene su propio comité, sin la evaluadora jurídica.
      const { proceso } = await conOfertasCerradas();
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

      await expect(registrar(proceso.id, juridica.acceso)).rejects.toThrow(
        /no fuiste designado en el comité/i,
      );
    });

    it('no se carga sin comité designado', async () => {
      const { proceso } = await conOfertasCerradas();

      await expect(registrar(proceso.id, juridica.acceso)).rejects.toThrow(
        /no tiene comité evaluador designado/i,
      );
    });

    it('no se carga mientras la recepción siga abierta', async () => {
      // Sin cerrar no hay comité que designar, así que el reclamo por la
      // recepción abierta tiene que llegar antes que el del comité.
      const proceso = await conOfertas(enHoras(48));

      await expect(registrar(proceso.id, juridica.acceso)).rejects.toThrow(/sigue abierta/i);
    });
  });

  // ------------------------------------------------------------ criterio 3 --

  describe('Criterio 3 · un solo informe vigente, que se puede volver a cargar', () => {
    it('no admite un segundo informe: se vuelve a cargar el vigente', async () => {
      const { proceso } = await conOfertasCerradas();
      await designar(proceso.id);
      await registrar(proceso.id, juridica.acceso);

      await expect(registrar(proceso.id, tecnico.acceso)).rejects.toThrow(/ya tiene el informe/i);
    });

    it('volver a cargarlo deja el anterior en el historial con su motivo (QA, EFDS-1157)', async () => {
      const { proceso } = await conOfertasCerradas();
      await designar(proceso.id);
      await registrar(proceso.id, juridica.acceso);

      const tras = await evaluacion.actualizar(
        proceso.id,
        { motivo: 'Faltaba la verificación financiera de la segunda oferta' },
        [{ archivo: archivo('informe-corregido.pdf'), hash: 'c'.repeat(64) }],
        tecnico.acceso,
      );

      expect(tras.resultado).not.toBeNull();
      expect(tras.resultado!.registradoPor).toBe('prueba.tecnico');
      expect(tras.rectificados).toHaveLength(1);
      expect(tras.rectificados[0].motivoRectificacion).toMatch(/verificación financiera/i);
      expect(tras.rectificados[0].rectificadoPor).toBe('prueba.tecnico');
      // El anterior se puede abrir desde el historial.
      expect(tras.rectificados[0].evidencias).toHaveLength(1);

      // Sin pasar por "sin informe": la actividad sigue cumplida.
      const [actividad] = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '6.3'`,
        [proceso.id],
      );
      expect(actividad.estado).toBe('APROBADO');
    });

    it('rectificar sin cargar otro deja el proceso sin informe', async () => {
      const { proceso } = await conOfertasCerradas();
      await designar(proceso.id);
      await registrar(proceso.id, juridica.acceso);

      const rectificado = await evaluacion.rectificar(
        proceso.id,
        { motivo: 'El comité corrigió la verificación financiera de la primera oferta' },
        juridica.acceso,
      );

      expect(rectificado.resultado).toBeNull();
      expect(rectificado.rectificados).toHaveLength(1);

      const [actividad] = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '6.3'`,
        [proceso.id],
      );
      expect(actividad.estado).toBe('BORRADOR');
    });

    it('las evidencias se suman al informe ya cargado', async () => {
      const { proceso } = await conOfertasCerradas();
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

      await registrar(proceso.id, juridica.acceso);
      const tras = await evidencia('Acta de reunión del comité', tecnico.acceso);

      // El archivo del informe y la evidencia sumada.
      expect(tras.resultado!.evidencias.map((e) => e.descripcion)).toEqual([
        'Informe de evaluación preliminar',
        'Acta de reunión del comité',
      ]);
      expect(tras.resultado!.evidencias[1].cargadaPor).toBe('prueba.tecnico');
    });
  });
});
