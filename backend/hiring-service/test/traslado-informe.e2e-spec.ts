import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
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
 * HU EFDS-1158 · Traslado del informe y subsanaciones (actividades 6.4 a 6.6).
 *
 * Lo que hay que comprobar contra la base es lo que ninguna prueba unitaria ve:
 *
 * - Que **el congelado aguante**. El informe copia el resultado del comité, y la
 *   prueba de que la copia sirve es rectificar la evaluación después de
 *   trasladar y confirmar que lo notificado no se movió. Eso son tres tablas y
 *   dos actividades: solo se ve punta a punta.
 * - Que el **término se calcule con el plazo de la modalidad** y se congele.
 * - Que la **cadena de condiciones** entre 6.3, 6.4, 6.5 y 6.6 exista de verdad
 *   y no solo en el servicio.
 */
describe('HU EFDS-1158 · traslado del informe y subsanaciones (6.4 a 6.6)', () => {
  let app: INestApplication;
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
  const OBJETO = 'Traslado del informe para pruebas';

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
   * Proceso listo para trasladar: abierto, con dos ofertas, recepción cerrada,
   * comité designado y resultado registrado.
   *
   * Menor cuantía porque la mínima queda fuera de la 5.7 según la matriz, y
   * porque su plazo de traslado son 3 días hábiles.
   */
  const conResultado = async () => {
    const proceso = await procesos.crearProceso(
      { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: 1_000_000 },
      gestor,
    );

    await cdp.solicitar(proceso.id, { rubro: 'A-02-02', valor: 1_000_000 }, gestor);
    await cdp.verificar(proceso.id, financiero);
    await cdp.expedir(
      proceso.id,
      { numero: 'CDP-2026-158', valor: 1_000_000, fechaExpedicion: hoy() },
      financiero,
    );
    await apertura.registrar(
      proceso.id,
      { resolucionNumero: 'RES-2026-158', resolucionFecha: hoy() },
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

    // Gana la segunda oferta: así se distingue de la primera al rectificar.
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

    return { proceso, oferentes: estado.oferentes };
  };

  const generar = (procesoId: string) =>
    traslado.generar(procesoId, {}, archivo('informe-preliminar.pdf'), 'p'.repeat(64), gestor);

  const trasladar = (procesoId: string) =>
    traslado.trasladar(
      procesoId,
      { medioPublicacion: MEDIO },
      archivo('evidencia.png', 'image/png'),
      'v'.repeat(64),
      gestor,
    );

  /** Proceso con el informe ya trasladado y el término corriendo. */
  const trasladado = async () => {
    const { proceso, oferentes } = await conResultado();
    await generar(proceso.id);
    const estado = await trasladar(proceso.id);
    return { proceso, oferentes, estado };
  };

  const presentar = (
    procesoId: string,
    oferenteId: string,
    datos: Partial<{ tipo: 'SUBSANACION' | 'OBSERVACION'; fechaPresentacion: string }> = {},
  ) =>
    escritos.registrar(
      procesoId,
      {
        oferenteId,
        tipo: 'SUBSANACION',
        presentadoPor: 'Barata SAS',
        fechaPresentacion: hoy(),
        asunto: 'Aporta certificación de experiencia',
        contenido: 'Se adjunta la certificación que no se cargó con la oferta.',
        ...datos,
      },
      archivo('escrito.pdf'),
      's'.repeat(64),
      gestor,
    );

  /**
   * Adelanta el vencimiento del término al pasado.
   *
   * El plazo se congela al trasladar y se cuenta en días hábiles: esperar tres
   * días en una prueba no es opción, y mover la fila es exactamente lo que
   * ocurre cuando el término vence solo.
   */
  const vencerTermino = (procesoId: string) =>
    dataSource.query(
      `UPDATE hiring.informes_evaluacion SET vence_el = $2 WHERE proceso_id = $1 AND estado = 'TRASLADADO'`,
      [procesoId, enDias(-1)],
    );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    traslado = app.get(TrasladoService);
    escritos = app.get(SubsanacionesService);
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
    await dataSource.query(`DELETE FROM hiring.cdp WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.procesos WHERE objeto = $1`, [OBJETO]);
    await app.close();
  });

  // ------------------------------------------------------------ criterio 1 --

  describe('Criterio 1 · el informe congela lo que se notifica', () => {
    it('genera el informe con el resultado del comité congelado', async () => {
      const { proceso, oferentes } = await conResultado();

      const estado = await generar(proceso.id);

      expect(estado.informe).not.toBeNull();
      expect(estado.informe!.estado).toBe('BORRADOR');
      expect(estado.informe!.resultado.ganadora.nombre).toBe('Cara SAS');
      // Recibidas, no habilitadas: la plataforma no calcula habilitación.
      expect(estado.informe!.ofertasRecibidas).toBe(2);
      expect(estado.informe!.resultado.ofertas).toHaveLength(2);
      expect(estado.informe!.resultado.ofertas.find((o) => o.ganadora)!.oferenteId).toBe(
        oferentes[1].id,
      );
    });

    /**
     * La prueba que justifica todo el modelo: el oferente reclama contra lo que
     * recibió, y eso no puede cambiar por detrás.
     */
    it('lo trasladado no cambia cuando el comité rectifica después', async () => {
      const { proceso, oferentes } = await trasladado();

      await evaluacion.rectificar(
        proceso.id,
        { motivo: 'Se aceptó la certificación aportada por la otra oferta' },
        juridica.acceso,
      );
      await evaluacion.registrar(
        proceso.id,
        {
          oferenteId: oferentes[0].id,
          puntajeObtenido: 95,
          puntajeMaximo: 100,
          justificacion: JUSTIFICACION,
        },
        archivo('informe-comite-2.pdf'),
        'j'.repeat(64),
        juridica.acceso,
      );

      const estado = await traslado.estado(proceso.id, gestor);

      // El resultado vigente ya es otro, pero el informe notificado sigue igual.
      expect(estado.informe!.resultado.ganadora.nombre).toBe('Cara SAS');
      const vigente = await evaluacion.estado(proceso.id, juridica.acceso);
      expect(vigente.resultado!.ganadora!.nombre).toBe('Barata SAS');
    });

    it('regenerar un borrador vuelve a tomar la fotografía', async () => {
      const { proceso, oferentes } = await conResultado();
      await generar(proceso.id);

      await evaluacion.rectificar(proceso.id, { motivo: 'Corrección del comité' }, juridica.acceso);
      await evaluacion.registrar(
        proceso.id,
        { oferenteId: oferentes[0].id, justificacion: JUSTIFICACION },
        archivo('informe-comite-2.pdf'),
        'j'.repeat(64),
        juridica.acceso,
      );

      const estado = await traslado.generar(proceso.id, {}, null, null, gestor);

      // Nadie lo ha recibido todavía, así que no hay nada que preservar.
      expect(estado.informe!.resultado.ganadora.nombre).toBe('Barata SAS');
      expect(estado.informe!.numero).toBe(1);
    });

    it('no genera informe si el comité no ha registrado resultado', async () => {
      const proceso = await procesos.crearProceso(
        { objeto: OBJETO, modalidad: 'ABREVIADA_MENOR_CUANTIA', valorEstimado: 1_000_000 },
        gestor,
      );

      await expect(generar(proceso.id)).rejects.toThrow(/no tiene resultado de evaluación/i);
    });
  });

  // ------------------------------------------------------------ criterio 2 --

  describe('Criterio 2 · trasladar abre el término', () => {
    it('congela el plazo de la modalidad y calcula el vencimiento', async () => {
      const { proceso } = await conResultado();
      await generar(proceso.id);

      const estado = await trasladar(proceso.id);

      expect(estado.informe!.estado).toBe('TRASLADADO');
      // Menor cuantía: 3 días hábiles, sembrados sin confirmar (EFDS-1467).
      expect(estado.informe!.plazoDiasHabiles).toBe(3);
      expect(estado.plazo!.confirmado).toBe(false);
      expect(estado.informe!.venceEl).not.toBeNull();
      expect(estado.informe!.venceEl! > hoy()).toBe(true);
      expect(estado.informe!.evidencia).not.toBeNull();
    });

    it('deja la actividad 6.4 cumplida al trasladar, no al generar', async () => {
      const { proceso } = await conResultado();
      await generar(proceso.id);

      const enBorrador = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '6.4'`,
        [proceso.id],
      );
      expect(enBorrador[0].estado).toBe('BORRADOR');

      await trasladar(proceso.id);

      const tras = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '6.4'`,
        [proceso.id],
      );
      expect(tras[0].estado).toBe('APROBADO');
    });

    it('no traslada dos veces el mismo informe', async () => {
      const { proceso } = await trasladado();

      await expect(trasladar(proceso.id)).rejects.toThrow(/ya fue trasladado/i);
    });
  });

  // ------------------------------------------------------------ criterio 3 --

  describe('Criterio 3 · subsanaciones dentro y fuera del término', () => {
    it('no admite escritos contra un informe que no se ha trasladado', async () => {
      const { proceso, oferentes } = await conResultado();
      await generar(proceso.id);

      await expect(presentar(proceso.id, oferentes[0].id)).rejects.toThrow(
        /todavía no se ha trasladado/i,
      );
    });

    it('registra en término lo presentado antes del vencimiento', async () => {
      const { proceso, oferentes } = await trasladado();

      const estado = await presentar(proceso.id, oferentes[0].id);

      expect(estado.subsanaciones).toHaveLength(1);
      expect(estado.subsanaciones[0].extemporanea).toBe(false);
      expect(estado.enTermino).toBe(true);
      expect(estado.pendientesDeRespuesta).toBe(1);
    });

    it('marca extemporáneo lo presentado después, pero lo registra igual', async () => {
      const { proceso, oferentes } = await trasladado();

      const estado = await presentar(proceso.id, oferentes[0].id, {
        fechaPresentacion: enDias(30),
      });

      // Extemporáneo no es rechazado: quien decide si lo acepta es la entidad.
      expect(estado.subsanaciones).toHaveLength(1);
      expect(estado.subsanaciones[0].extemporanea).toBe(true);
    });

    it('solo subsana quien presentó oferta en este proceso', async () => {
      const { proceso } = await trasladado();
      const otro = await trasladado();

      await expect(presentar(proceso.id, otro.oferentes[0].id)).rejects.toThrow(
        /no está en la lista de este proceso/i,
      );
    });

    it('cuelga lo presentado del informe y no del proceso', async () => {
      const { proceso, oferentes } = await trasladado();
      await presentar(proceso.id, oferentes[0].id);

      // Anular el informe y trasladar otro: el nuevo nace sin nada presentado,
      // porque lo anterior se presentó contra el informe que se anuló.
      await traslado.anular(proceso.id, { motivo: 'Se rehace por error material' }, gestor);
      await generar(proceso.id);
      await trasladar(proceso.id);

      const estado = await escritos.listar(proceso.id);
      expect(estado.subsanaciones).toHaveLength(0);
    });
  });

  // ------------------------------------------------------------ criterio 4 --

  describe('Criterio 4 · responder y cerrar el traslado', () => {
    it('no cierra mientras el término sigue corriendo', async () => {
      const { proceso } = await trasladado();

      await expect(escritos.cerrar(proceso.id, {}, gestor)).rejects.toThrow(
        /término sigue corriendo/i,
      );
    });

    it('no cierra con escritos sin responder, aunque el término haya vencido', async () => {
      const { proceso, oferentes } = await trasladado();
      await presentar(proceso.id, oferentes[0].id);
      await vencerTermino(proceso.id);

      await expect(escritos.cerrar(proceso.id, {}, gestor)).rejects.toThrow(/sin responder/i);
    });

    it('responder deja la respuesta con quién y cuándo', async () => {
      const { proceso, oferentes } = await trasladado();
      const tras = await presentar(proceso.id, oferentes[0].id);

      const estado = await escritos.responder(
        proceso.id,
        tras.subsanaciones[0].id,
        { aceptada: true, respuesta: 'Se acepta la certificación aportada y se reevalúa.' },
        archivo('respuesta.pdf'),
        'r'.repeat(64),
        gestor,
      );

      expect(estado.subsanaciones[0].aceptada).toBe(true);
      expect(estado.subsanaciones[0].respondidaPor).toBe('prueba.gestor');
      expect(estado.subsanaciones[0].respondidaAt).not.toBeNull();
      expect(estado.subsanaciones[0].respuestaDocumento).not.toBeNull();
      expect(estado.pendientesDeRespuesta).toBe(0);
      // Una subsanación aceptada puede obligar al comité a rectificar.
      expect(estado.requiereRectificacion).toBe(true);
    });

    it('cierra cuando el término venció y no queda nada sin responder', async () => {
      const { proceso, oferentes } = await trasladado();
      const tras = await presentar(proceso.id, oferentes[0].id);
      await escritos.responder(
        proceso.id,
        tras.subsanaciones[0].id,
        { aceptada: false, respuesta: 'No se acepta: lo aportado no subsana lo requerido.' },
        null,
        null,
        gestor,
      );
      await vencerTermino(proceso.id);

      const estado = await escritos.cerrar(
        proceso.id,
        { nota: 'Se cierra el traslado sin más escritos.' },
        gestor,
      );

      expect(estado.trasladado).toBe(false);
      const actividades = await dataSource.query(
        `SELECT numeral, estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral IN ('6.5','6.6') ORDER BY numeral`,
        [proceso.id],
      );
      // Cerrar el traslado cierra las dos actividades del riel.
      expect(actividades.map((a: any) => a.estado)).toEqual(['APROBADO', 'APROBADO']);
    });

    it('cerrado, ya no se registra ni se responde nada más', async () => {
      const { proceso, oferentes } = await trasladado();
      await vencerTermino(proceso.id);
      await escritos.cerrar(proceso.id, {}, gestor);

      await expect(presentar(proceso.id, oferentes[0].id)).rejects.toThrow(/ya se cerró/i);
    });
  });
});
