import { Test } from '@nestjs/testing';
import { INestApplication, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { Documento } from '../src/entities/documento.entity';
import { Expediente } from '../src/entities/expediente.entity';
import { CampoFormulario } from '../src/entities/campo-formulario.entity';
import { HiringAccess } from '../src/auth/hiring-access';

/**
 * Los dos criterios de aceptación del HU EFDS-1146, recorridos de punta a
 * punta contra la base de datos real.
 *
 * Se prueban aquí y no con el DataSource simulado porque el criterio 1 afirma
 * que "el sistema registra el documento en el expediente": eso solo se puede
 * comprobar leyendo el expediente después. Un mock confirmaría que se llamó a
 * `save`, no que el documento quedó guardado —y el fallo del catálogo de
 * modalidades, una entidad sin registrar en el DataSource, es justo la clase
 * de error que un mock oculta porque compila y pasa.
 *
 * Requiere Postgres levantado con las migraciones de hiring aplicadas.
 */
describe('HU EFDS-1146 · criterios de aceptación', () => {
  let app: INestApplication;
  let service: EstudioPrevioService;
  let dataSource: DataSource;

  const gestor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000001',
    userName: 'prueba.gestor',
    roles: ['GESTOR_CONTRATACION'],
    puedeEditar: true,
  };

  /** Datos completos según los campos obligatorios vigentes en base. */
  const datosCompletos = async (): Promise<Record<string, any>> => {
    const obligatorios = await dataSource.getRepository(CampoFormulario).find({
      where: { numeral: '3.1', obligatorio: true, activo: true },
    });

    const valores: Record<string, any> = {};
    for (const campo of obligatorios) {
      switch (campo.tipo) {
        case 'numero':
        case 'moneda':
          valores[campo.codigo] = 1000;
          break;
        case 'seleccion':
          valores[campo.codigo] = campo.opciones?.[0] ?? 'Sí';
          break;
        default:
          valores[campo.codigo] = `Valor de prueba para ${campo.etiqueta}`;
      }
    }
    return valores;
  };

  const crearProceso = async () =>
    service.crearProceso(
      { objeto: 'Adquisición de equipos para pruebas', modalidad: 'MINIMA_CUANTIA', valorEstimado: 1000000 },
      gestor,
    );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    service = app.get(EstudioPrevioService);
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    // Los procesos de prueba se identifican por su objeto para no borrar datos
    // reales si alguien corre esto contra una base compartida.
    await dataSource.query(
      `DELETE FROM hiring.procesos WHERE objeto = 'Adquisición de equipos para pruebas'`,
    );
    await app.close();
  });

  // ------------------------------------------------------------ criterio 1 --

  describe('Criterio 1 · el estudio previo queda registrado en el expediente', () => {
    it('abre un expediente electrónico único al crear el proceso', async () => {
      // Regla de negocio RF-SIS-04: el estudio previo debe quedar asociado al
      // expediente único del proceso, así que el expediente nace con él.
      const proceso = await crearProceso();

      const expedientes = await dataSource.getRepository(Expediente).find({
        where: { procesoId: proceso.id },
      });

      expect(expedientes).toHaveLength(1);
      expect(expedientes[0].numeroExpediente).toMatch(/^EXP-\d{4}-\d{4}$/);
    });

    it('guarda lo diligenciado y lo devuelve al releer', async () => {
      const proceso = await crearProceso();
      const datos = await datosCompletos();

      await service.guardarBorrador(proceso.id, { datos, version: 1 }, gestor);
      const leido: any = await service.obtener(proceso.id);

      // valor_estimado vive en el proceso desde EFDS-1147 y obtener() lo inyecta
      // desde ahi, asi que no se compara contra lo que se envio en el formulario.
      const { valor_estimado: _ve, ...esperado } = datos;
      expect(leido.datos).toMatchObject(esperado);
    });

    it('registra la referencia normativa junto a los datos', async () => {
      // El criterio exige que el documento quede "con su referencia
      // normativa": es el fundamento jurídico del formulario.
      const proceso = await crearProceso();
      const datos = await datosCompletos();

      await service.guardarBorrador(proceso.id, { datos, version: 1 }, gestor);
      const leido: any = await service.obtener(proceso.id);

      expect(leido.datos.fundamento_juridico).toBeDefined();
      expect(String(leido.datos.fundamento_juridico)).not.toHaveLength(0);
    });

    it('ofrece las 11 modalidades, porque la 3.1 aplica a todas', async () => {
      // Regla de negocio: "Aplicabilidad por modalidad: todas las 11".
      const modalidades = await service.modalidades();

      expect(modalidades).toHaveLength(11);
    });

    it('deja el estudio previo disponible para consultarlo después', async () => {
      // "lo deja disponible para las etapas siguientes": el expediente se
      // puede leer desde fuera de la actividad que lo produjo.
      const proceso = await crearProceso();
      const datos = await datosCompletos();
      await service.guardarBorrador(proceso.id, { datos, version: 1 }, gestor);

      const expediente = await service.expediente(proceso.id);

      expect(expediente.numeroExpediente).toBeDefined();
      expect(expediente.documentos).toBeDefined();
    });
  });

  // ------------------------------------------------------------ criterio 2 --

  describe('Criterio 2 · el envío incompleto se bloquea y señala qué falta', () => {
    it('impide enviar un estudio previo vacío', async () => {
      const proceso = await crearProceso();

      await expect(service.enviar(proceso.id, gestor)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('nombra cada campo obligatorio que falta', async () => {
      // "señala los campos faltantes": la respuesta trae la lista, no un
      // mensaje genérico. De aquí sale lo que el front marca en pantalla.
      const proceso = await crearProceso();

      let error: any;
      try {
        await service.enviar(proceso.id, gestor);
      } catch (e) {
        error = e;
      }

      const cuerpo = error.getResponse();
      expect(Array.isArray(cuerpo.camposFaltantes)).toBe(true);
      expect(cuerpo.camposFaltantes.length).toBeGreaterThan(0);
      expect(cuerpo.camposFaltantes[0]).toHaveProperty('codigo');
      expect(cuerpo.camposFaltantes[0]).toHaveProperty('etiqueta');
    });

    it('no cuenta como diligenciado un campo con solo espacios', async () => {
      // Sin esto, dar a la barra espaciadora bastaría para saltarse el
      // criterio 2 en cualquier campo de texto.
      const proceso = await crearProceso();
      const datos = await datosCompletos();
      const codigoTexto = Object.keys(datos).find((k) => typeof datos[k] === 'string')!;
      datos[codigoTexto] = '   ';

      await service.guardarBorrador(proceso.id, { datos, version: 1 }, gestor);

      let error: any;
      try {
        await service.enviar(proceso.id, gestor);
      } catch (e) {
        error = e;
      }

      const faltantes = error.getResponse().camposFaltantes.map((c: any) => c.codigo);
      expect(faltantes).toContain(codigoTexto);
    });

    it('sigue bloqueando con los datos completos pero sin el documento', async () => {
      // El estudio previo se diligencia y firma en el formato oficial: sin el
      // archivo la actividad no tiene entregable, por más metadatos que haya.
      const proceso = await crearProceso();
      const datos = await datosCompletos();
      await service.guardarBorrador(proceso.id, { datos, version: 1 }, gestor);

      let error: any;
      try {
        await service.enviar(proceso.id, gestor);
      } catch (e) {
        error = e;
      }

      const cuerpo = error.getResponse();
      expect(cuerpo.camposFaltantes).toHaveLength(0);
      expect(cuerpo.documentoFaltante).toBe(true);
    });

    it('deja enviar cuando están los datos y el documento', async () => {
      const proceso = await crearProceso();
      const datos = await datosCompletos();
      await service.guardarBorrador(proceso.id, { datos, version: 1 }, gestor);

      const expediente = await dataSource.getRepository(Expediente).findOneOrFail({
        where: { procesoId: proceso.id },
      });
      await dataSource.getRepository(Documento).save({
        expedienteId: expediente.id,
        numeral: '3.1',
        tipo: 'ADJUNTO',
        nombre: 'estudio-previo-firmado.pdf',
        // ck_doc_contenido exige archivo en un adjunto: un ADJUNTO sin ruta no
        // apuntaría a nada y el expediente quedaría con un registro hueco.
        archivoUrl: '/uploads/pruebas/estudio-previo-firmado.pdf',
        hashSha256: 'a'.repeat(64),
        subidoPor: gestor.userName,
      } as Partial<Documento>);

      const resultado = await service.enviar(proceso.id, gestor);

      expect(resultado.estado).toBe('EN_REVISION');
    });

    it('el proceso no avanza mientras el envío esté bloqueado', async () => {
      // "impide avanzar": si el estado quedara alterado tras un envío
      // rechazado, la actividad avanzaría sin cumplir el criterio.
      const proceso = await crearProceso();

      await expect(service.enviar(proceso.id, gestor)).rejects.toThrow();
      const despues = await service.obtener(proceso.id);

      expect(despues.estado).toBe('BORRADOR');
      expect(despues.editable).toBe(true);
    });
    it('descarta los campos retirados en vez de rechazar el guardado', async () => {
      // Al desactivar un campo, los procesos que alcanzaron a diligenciarlo
      // siguen enviandolo desde el formulario. Rechazarlos los dejaria sin
      // poder guardar nunca mas, que es lo que ocurrio con
      // modalidad_propuesta tras la migracion 007.
      const proceso = await crearProceso();
      const datos = await datosCompletos();

      await service.guardarBorrador(
        proceso.id,
        { datos: { ...datos, modalidad_propuesta: 'Minima Cuantia' }, version: 1 },
        gestor,
      );
      const leido: any = await service.obtener(proceso.id);

      expect(leido.datos.modalidad_propuesta).toBeUndefined();
      // valor_estimado vive en el proceso desde EFDS-1147 y obtener() lo inyecta
      // desde ahi, asi que no se compara contra lo que se envio en el formulario.
      const { valor_estimado: _ve, ...esperado } = datos;
      expect(leido.datos).toMatchObject(esperado);
    });

    it('rechaza una clave que nunca existio', async () => {
      // Lo contrario del caso anterior: un codigo inventado si debe frenarse,
      // porque de otro modo un cliente podria meter cualquier cosa en el
      // expediente.
      const proceso = await crearProceso();

      await expect(
        service.guardarBorrador(proceso.id, { datos: { inventado_xyz: 'x' }, version: 1 }, gestor),
      ).rejects.toThrow(/Campos no definidos/);
    });
  });
});
