import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { ComiteService } from '../src/modules/comite/comite.service';
import { OfertasService } from '../src/modules/ofertas/ofertas.service';
import { AperturaService } from '../src/modules/apertura/apertura.service';
import { CdpService } from '../src/modules/cdp/cdp.service';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { MiembroComiteDto } from '../src/modules/comite/dto/comite.dto';
import { HiringAccess } from '../src/auth/hiring-access';

/**
 * HU EFDS-1156 · Designar el Comité Evaluador (actividad 6.2).
 *
 * Lo que hay que comprobar contra la base es el encadenamiento con la actividad
 * anterior: el comité solo se designa sobre una recepción cerrada y con
 * oferentes, y esas dos condiciones viven en tablas de la 6.1. Una prueba
 * unitaria del servicio no vería si el enlace entre las dos actividades existe.
 */
describe('HU EFDS-1156 · comité evaluador (actividad 6.2)', () => {
  let app: INestApplication;
  let comite: ComiteService;
  let ofertas: OfertasService;
  let apertura: AperturaService;
  let cdp: CdpService;
  let procesos: EstudioPrevioService;
  let dataSource: DataSource;

  const OBJETO = 'Comité evaluador para pruebas';

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

  const hoy = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
  const haceHoras = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString();

  const archivo = (nombre: string, mimetype = 'application/pdf') => ({
    filename: `${nombre}-en-disco`,
    originalname: nombre,
    mimetype,
    size: 1024,
  });

  const JURIDICA: MiembroComiteDto = {
    personaId: '11111111-1111-4111-8111-111111111111',
    nombre: 'Ana Ruiz',
    rol: 'JURIDICO',
  };
  const TECNICO: MiembroComiteDto = {
    personaId: '22222222-2222-4222-8222-222222222222',
    nombre: 'Luis Prada',
    rol: 'TECNICO',
  };

  const crear = (modalidad = 'MINIMA_CUANTIA') =>
    procesos.crearProceso({ objeto: OBJETO, modalidad, valorEstimado: 1_000_000 }, gestor);

  /** Lleva el proceso hasta abierto, que es cuando arranca el plazo de ofertas. */
  const abrir = async (procesoId: string) => {
    await cdp.solicitar(procesoId, { rubro: 'A-02-02', valor: 1_000_000 }, gestor);
    await cdp.verificar(procesoId, financiero);
    await cdp.expedir(
      procesoId,
      { numero: 'CDP-2026-156', valor: 1_000_000, fechaExpedicion: hoy() },
      financiero,
    );

    return apertura.registrar(
      procesoId,
      { resolucionNumero: 'RES-2026-156', resolucionFecha: hoy() },
      archivo('resolucion.pdf'),
      'a'.repeat(64),
      archivo('pliego-definitivo.pdf'),
      'b'.repeat(64),
      archivo('captura-secop.png', 'image/png'),
      'e'.repeat(64),
      gestor,
    );
  };

  /** Proceso abierto, con una oferta recibida y la recepción ya cerrada. */
  const cerrarConOferta = async () => {
    const proceso = await crear();
    await abrir(proceso.id);
    await ofertas.fijarPlazo(proceso.id, { vencimiento: haceHoras(3) }, gestor);
    await ofertas.registrar(
      proceso.id,
      {
        nombre: 'Constructora de prueba SAS',
        identificacion: '900123456-1',
        fechaRadicacion: haceHoras(4),
      },
      archivo('oferta.pdf'),
      'o'.repeat(64),
      gestor,
    );
    await ofertas.cerrar(proceso.id, gestor);
    return proceso;
  };

  const designar = (procesoId: string, miembros: MiembroComiteDto[] = [JURIDICA, TECNICO]) =>
    comite.designar(
      procesoId,
      { fechaDesignacion: hoy(), miembros },
      archivo('memorando.pdf'),
      'm'.repeat(64),
      ordenador,
    );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    comite = app.get(ComiteService);
    ofertas = app.get(OfertasService);
    apertura = app.get(AperturaService);
    cdp = app.get(CdpService);
    procesos = app.get(EstudioPrevioService);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    const deProceso = `proceso_id IN (SELECT id FROM hiring.procesos WHERE objeto = $1)`;
    await dataSource.query(
      `DELETE FROM hiring.miembros_comite WHERE comite_id IN (SELECT id FROM hiring.comites_evaluadores WHERE ${deProceso})`,
      [OBJETO],
    );
    await dataSource.query(`DELETE FROM hiring.comites_evaluadores WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(
      `DELETE FROM hiring.oferentes WHERE recepcion_id IN (SELECT id FROM hiring.recepciones_ofertas WHERE ${deProceso})`,
      [OBJETO],
    );
    await dataSource.query(`DELETE FROM hiring.recepciones_ofertas WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.cdp WHERE ${deProceso}`, [OBJETO]);
    await dataSource.query(`DELETE FROM hiring.procesos WHERE objeto = $1`, [OBJETO]);
    await app.close();
  });

  // ------------------------------------------------------------ criterio 1 --

  describe('Criterio 1 · designación sobre una lista cerrada', () => {
    it('registra el comité con su memorando y sus miembros', async () => {
      const proceso = await cerrarConOferta();

      const estado = await designar(proceso.id);

      expect(estado.designado).toBe(true);
      expect(estado.comite!.fechaDesignacion).toBe(hoy());
      expect(estado.comite!.designadoPor).toBe('prueba.ordenador');
      expect(estado.comite!.memorando).not.toBeNull();
      expect(estado.miembros).toHaveLength(2);
      expect(estado.miembros.map((m) => m.rol).sort()).toEqual(['JURIDICO', 'TECNICO']);
    });

    it('da la actividad 6.2 por cumplida al designar', async () => {
      const proceso = await cerrarConOferta();
      await designar(proceso.id);

      const [fila] = await dataSource.query(
        `SELECT estado FROM hiring.proceso_actividades WHERE proceso_id = $1 AND numeral = '6.2'`,
        [proceso.id],
      );

      expect(fila.estado).toBe('APROBADO');
    });

    it('rechaza designar mientras la recepción siga abierta', async () => {
      const proceso = await crear();
      await abrir(proceso.id);

      await expect(designar(proceso.id)).rejects.toThrow(/no se ha cerrado/i);

      const estado = await comite.estado(proceso.id);
      expect(estado.puedeDesignar).toBe(false);
      expect(estado.recepcionCerrada).toBe(false);
    });

    it('rechaza designar si el proceso cerró sin ofertas', async () => {
      const proceso = await crear();
      await abrir(proceso.id);
      await ofertas.fijarPlazo(proceso.id, { vencimiento: haceHoras(3) }, gestor);
      await ofertas.cerrar(proceso.id, gestor);

      // Cerrada sí, pero no hay nada que evaluar.
      await expect(designar(proceso.id)).rejects.toThrow(/sin ofertas/i);

      const estado = await comite.estado(proceso.id);
      expect(estado.recepcionCerrada).toBe(true);
      expect(estado.totalOferentes).toBe(0);
      expect(estado.puedeDesignar).toBe(false);
    });

    it('no admite dos comités vigentes en el mismo proceso', async () => {
      const proceso = await cerrarConOferta();
      await designar(proceso.id);

      await expect(designar(proceso.id)).rejects.toThrow(/ya tiene comité/i);
    });

    it('no acepta la designación con fecha futura', async () => {
      const proceso = await cerrarConOferta();
      const manana = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

      await expect(
        comite.designar(
          proceso.id,
          { fechaDesignacion: manana, miembros: [JURIDICA] },
          archivo('memorando.pdf'),
          'm'.repeat(64),
          ordenador,
        ),
      ).rejects.toThrow(/posterior a hoy/i);
    });
  });

  // ------------------------------------------------------- los miembros --

  describe('Composición del comité', () => {
    it('permite que una persona lleve dos dimensiones distintas', async () => {
      const proceso = await cerrarConOferta();

      // En una entidad pequeña es corriente que quien evalúa lo técnico evalúe
      // también lo financiero; RF-SIS-02 no dice que sean excluyentes.
      const estado = await designar(proceso.id, [
        JURIDICA,
        TECNICO,
        { ...TECNICO, rol: 'FINANCIERO' },
      ]);

      expect(estado.miembros).toHaveLength(3);
      expect(estado.miembros.filter((m) => m.personaId === TECNICO.personaId)).toHaveLength(2);
    });

    it('rechaza a la misma persona repitiendo la misma dimensión', async () => {
      const proceso = await cerrarConOferta();

      await expect(designar(proceso.id, [JURIDICA, JURIDICA])).rejects.toThrow(/dos veces/i);
    });
  });

  // -------------------------------------------------------- la revocación --

  describe('Revocar y designar de nuevo', () => {
    it('conserva el comité revocado y permite designar otro', async () => {
      const proceso = await cerrarConOferta();
      await designar(proceso.id);

      const tras = await comite.revocar(
        proceso.id,
        { motivo: 'Uno de los evaluadores quedó impedido por conflicto de interés' },
        ordenador,
      );
      expect(tras.designado).toBe(false);
      expect(tras.puedeDesignar).toBe(true);

      const nuevo = await designar(proceso.id, [JURIDICA]);
      expect(nuevo.designado).toBe(true);
      expect(nuevo.miembros).toHaveLength(1);

      // El revocado sigue en el expediente: existió y pudo evaluar.
      const [{ total }] = await dataSource.query(
        `SELECT count(*)::int AS total FROM hiring.comites_evaluadores WHERE proceso_id = $1`,
        [proceso.id],
      );
      expect(total).toBe(2);
    });
  });

  // ------------------------------------------------------- aplicabilidad --

  describe('Modalidades sin comité evaluador', () => {
    it('no aplica en contratación directa', async () => {
      const proceso = await crear('CONTRATACION_DIRECTA');

      const estado = await comite.estado(proceso.id);

      expect(estado.aplica).toBe(false);
      expect(estado.motivoNoAplica).toMatch(/no evalúa ofertas en competencia/i);
      expect(estado.puedeDesignar).toBe(false);
    });
  });
});
