import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { EstadisticasService } from '../src/modules/estadisticas/estadisticas.service';
import { EstudioPrevioService } from '../src/modules/estudio-previo/estudio-previo.service';
import { HiringAccess } from '../src/auth/hiring-access';
import { PERMISO_REPORTE_VER, permisosDelUsuario } from '../src/auth/permisos';

/**
 * HU EFDS-1189 · estadísticas y reportes de gestión (numeral 3.1.a).
 *
 * Lo que aquí importa y una unitaria no puede ver es **que las consultas corran
 * contra el esquema de verdad**: el servicio agrupa con SQL directo sobre cinco
 * tablas, y una columna que la consulta nombre y la base no tenga no falla en
 * ninguna otra prueba —ninguna las lee juntas—. Falla aquí, y no en la pantalla
 * de quien va a rendir cuentas.
 *
 * Lo demás —cómo se agrupan los diez estados del ciclo en los cinco del
 * informe— se prueba en `estadisticas.service.spec.ts` con una base falsa,
 * porque es una regla de negocio y no tiene por qué depender de Postgres.
 */
describe('HU EFDS-1189 · estadísticas de gestión contractual', () => {
  let app: INestApplication;
  let estadisticas: EstadisticasService;
  let procesos: EstudioPrevioService;
  let dataSource: DataSource;

  const OBJETO = 'Estadísticas de gestión para pruebas';
  const NUMERO_CONTRATO = 'EFDS-1189-PRUEBA-001';
  const VALOR = 12_345_000;

  /** El año en que se siembra el contrato, para probar el filtro de vigencia. */
  const VIGENCIA = new Date().getFullYear();

  const gestor: HiringAccess = {
    userId: '00000000-0000-0000-0000-000000000001',
    userName: 'prueba.gestor',
    roles: ['GESTOR_CONTRATACION'],
    puedeEditar: true,
  };

  const SIN_FILTROS = { vigencia: null, modalidad: null };

  /**
   * Un contrato en ejecución, insertado con SQL.
   *
   * Y no llevando el proceso por las ocho etapas hasta firmarlo: lo que se
   * prueba es la consulta, y recorrer el flujo entero para llegar a un `SUM`
   * haría que esta prueba fallara por cualquier cosa menos por lo suyo.
   */
  async function sembrarContrato(): Promise<string> {
    const proceso = await procesos.crearProceso(
      { objeto: OBJETO, modalidad: 'MINIMA_CUANTIA', valorEstimado: VALOR },
      gestor,
    );

    const [expediente] = await dataSource.query(
      `SELECT id FROM hiring.expedientes WHERE proceso_id = $1`,
      [proceso.id],
    );

    const [documento] = await dataSource.query(
      `INSERT INTO hiring.documentos (expediente_id, numeral, tipo, nombre, archivo_url, hash_sha256)
       VALUES ($1, '8.1', 'ADJUNTO', 'minuta-de-prueba.pdf', '/uploads/minuta-de-prueba.pdf', $2)
       RETURNING id`,
      [expediente.id, 'a'.repeat(64)],
    );

    await dataSource.query(
      // `ejecucion_desde` no es opcional: `ck_contrato_ejecucion` no admite un
      // contrato corriendo sin fecha de arranque, y hace bien —sería un estado
      // que nadie puede fechar—.
      `INSERT INTO hiring.contratos
         (proceso_id, tipologia, numero, objeto, valor, contratista_documento,
          contratista_nombre, contratista_tipo, minuta_documento_id, estado,
          ejecucion_desde)
       VALUES ($1, 'PRESTACION_SERVICIOS_PN', $2, $3, $4, '1000000001',
               'Contratista de prueba', 'NATURAL', $5, 'EJECUCION', CURRENT_DATE)`,
      [proceso.id, NUMERO_CONTRATO, OBJETO, VALOR, documento.id],
    );

    return proceso.id;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    estadisticas = app.get(EstadisticasService);
    procesos = app.get(EstudioPrevioService);
    dataSource = app.get(DataSource);

    await sembrarContrato();
  });

  afterAll(async () => {
    // Los contratos y documentos se van en cascada con el proceso.
    await dataSource.query(`DELETE FROM hiring.procesos WHERE objeto = $1`, [OBJETO]);
    await app.close();
  });

  it('las cinco consultas corren contra el esquema', async () => {
    // Si al esquema le falta una columna que el SQL nombra, revienta aquí.
    const reporte = await estadisticas.gestion(SIN_FILTROS);

    expect(reporte.generadoEn).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(Array.isArray(reporte.contratos.porEstado)).toBe(true);
    expect(Array.isArray(reporte.procesos.porDesenlace)).toBe(true);
    expect(Array.isArray(reporte.vigenciasDisponibles)).toBe(true);
  });

  it('el contrato sembrado se cuenta en ejecución', async () => {
    const reporte = await estadisticas.gestion(SIN_FILTROS);
    const enEjecucion = reporte.contratos.porEstado.find((c) => c.clave === 'EJECUCION');

    expect(enEjecucion).toBeDefined();
    expect(enEjecucion!.cuantos).toBeGreaterThanOrEqual(1);
    expect(enEjecucion!.valor).toBeGreaterThanOrEqual(VALOR);
  });

  it('los cortes cuadran con el total', async () => {
    // La misma cifra por dos caminos: si no coinciden, el informe se contradice
    // consigo mismo y no sirve para rendir cuentas.
    const { contratos } = await estadisticas.gestion(SIN_FILTROS);

    const porEstado = contratos.porEstado.reduce((s, c) => s + c.cuantos, 0);
    expect(porEstado).toBe(contratos.total);

    const valorPorEstado = contratos.porEstado.reduce((s, c) => s + c.valor, 0);
    expect(valorPorEstado).toBe(contratos.valorTotal);
  });

  it('la vigencia del contrato aparece entre las disponibles', async () => {
    const reporte = await estadisticas.gestion(SIN_FILTROS);
    expect(reporte.vigenciasDisponibles).toContain(VIGENCIA);
  });

  it('el filtro de vigencia acota el reporte', async () => {
    const reporte = await estadisticas.gestion({ vigencia: 1991, modalidad: null });

    expect(reporte.contratos.total).toBe(0);
    expect(reporte.contratos.valorTotal).toBe(0);
    // Sin contratos, la ejecución presupuestal no divide por cero.
    expect(reporte.presupuesto.porcentajeEjecutado).toBe(0);
  });

  it('el filtro de modalidad acota el reporte', async () => {
    const conLaSuya = await estadisticas.gestion({
      vigencia: VIGENCIA,
      modalidad: 'MINIMA_CUANTIA',
    });
    expect(conLaSuya.contratos.total).toBeGreaterThanOrEqual(1);

    const conOtra = await estadisticas.gestion({
      vigencia: VIGENCIA,
      modalidad: 'NO_EXISTE_ESTA_MODALIDAD',
    });
    expect(conOtra.contratos.total).toBe(0);
  });

  it('lo pagado nunca sale de una cuenta sin tramitar', async () => {
    // El contrato sembrado no tiene pagos: si el filtro por estado 'TRAMITADO'
    // se cayera, aquí aparecería plata que no salió de la entidad.
    const reporte = await estadisticas.gestion({
      vigencia: VIGENCIA,
      modalidad: 'MINIMA_CUANTIA',
    });

    expect(reporte.presupuesto.pagado).toBe(0);
    expect(reporte.presupuesto.porPagar).toBe(reporte.presupuesto.contratado);
  });

  /**
   * Quién puede pedir el reporte.
   *
   * El endpoint lo protege `PermisosGuard` con `contratacion.reporte.view`, así
   * que basta comprobar a quién le concede ese permiso el mapa que el guard
   * consulta: montar un servidor HTTP para volver a probar el guard probaría a
   * Nest, no al módulo.
   */
  describe('quién genera los informes', () => {
    const puede = (rol: string) =>
      permisosDelUsuario({ roles: [rol] }).includes(PERMISO_REPORTE_VER);

    it('el apoyo a la supervisión, que es de quien es el trabajo', () => {
      // «Generamos informes, estadísticas, certificaciones, indicadores» —Hoja2
      // del formato de roles.
      expect(puede('APOYO_SUPERVISION')).toBe(true);
    });

    it('la Dirección y el administrador del módulo', () => {
      expect(puede('DIRECTOR_CONTRATACION')).toBe(true);
      expect(puede('ADMINISTRADOR_CONTRATACION')).toBe(true);
    });

    it('el gestor que tramita no genera los informes de gestión', () => {
      expect(puede('GESTOR_CONTRATACION')).toBe(false);
    });

    it('ni el supervisor de un contrato', () => {
      expect(puede('SUPERVISOR_CONTRATO')).toBe(false);
    });
  });
});
