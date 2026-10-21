import { AlertasService } from './alertas.service';

const acceso = { userId: 'u-1', userName: 'luis@esap.edu.co', roles: ['REVISOR_CONTRATACION'], puedeEditar: false };

/**
 * La bandeja «Por revisar».
 *
 * Junta las aprobaciones configuradas con los estudios previos que esperan al
 * abogado asignado: la 3.4 no sale de una regla, sale del reparto, y la alerta
 * de aprobación no la veía.
 */
function montar(
  filas: {
    aprobaciones: any[];
    estudios: any[];
    garantias?: any[];
    modificaciones?: any[];
    pagos?: any[];
  },
  /** Lo que la matriz de permisos le deja a quien consulta. */
  permite: (accion: string, numeral: string) => boolean = () => true,
) {
  const consultas: string[] = [];
  const dataSource = {
    query: jest.fn(async (sql: string) => {
      consultas.push(sql);
      if (sql.includes('reglas_actividad')) return filas.aprobaciones;
      if (sql.includes('FROM hiring.garantias')) return filas.garantias ?? [];
      if (sql.includes('FROM hiring.modificaciones_contrato')) return filas.modificaciones ?? [];
      if (sql.includes('FROM hiring.pagos_contrato')) return filas.pagos ?? [];
      if (sql.includes('participaciones_proceso')) return filas.estudios;
      return [];
    }),
  };
  const alcance = { puedeEn: jest.fn(async (_a: unknown, accion: string, numeral: string) => permite(accion, numeral)) };
  const service = new AlertasService(dataSource as never, {} as never, {} as never, alcance as never);
  return { service, consultas };
}

const fila = (numeral: string, desde: string) => ({
  proceso_id: `p-${numeral}`,
  radicado: 'CTO-2026-0001',
  objeto: 'Vigilancia',
  modalidad: 'Mínima Cuantía',
  numeral,
  actividad: `Actividad ${numeral}`,
  etapa: Number.parseInt(numeral, 10),
  version: 2,
  enviado_por: 'ana@esap.edu.co',
  desde: new Date(desde),
});

describe('bandeja Por revisar', () => {
  it('trae los estudios previos del abogado junto con las aprobaciones', async () => {
    const { service } = montar({
      aprobaciones: [fila('4.1', '2026-09-20')],
      estudios: [fila('3.1', '2026-09-25')],
    });

    const lista = await service.porRevisar(acceso);

    expect(lista.map((e) => [e.tipo, e.numeral])).toEqual(
      expect.arrayContaining([
        ['ESTUDIO_PREVIO', '3.1'],
        ['ACTIVIDAD', '4.1'],
      ]),
    );
  });

  it('no lista la 3.1 dos veces aunque tenga regla de aprobación', async () => {
    // Su decisión es la del abogado; ofrecerla también por la regla abriría
    // dos caminos para lo mismo.
    const { service } = montar({ aprobaciones: [fila('3.1', '2026-09-20')], estudios: [] });

    await expect(service.porRevisar(acceso)).resolves.toEqual([]);
  });

  it('lo que más lleva esperando va primero', async () => {
    const { service } = montar({
      aprobaciones: [fila('5.1', '2026-09-28'), fila('4.1', '2026-09-01')],
      estudios: [],
    });

    const lista = await service.porRevisar(acceso);

    expect(lista.map((e) => e.numeral)).toEqual(['4.1', '5.1']);
    expect(lista[0].diasEsperando).toBeGreaterThan(lista[1].diasEsperando);
  });

  it('sin usuario no busca estudios por abogado', async () => {
    const { service, consultas } = montar({ aprobaciones: [], estudios: [fila('3.1', '2026-09-20')] });

    await service.porRevisar({ ...acceso, userId: '', userName: '' });

    expect(consultas.some((c) => c.includes('participaciones_proceso'))).toBe(false);
  });

  it('trae las pólizas, modificaciones y cuentas de cobro, cada una con su detalle', async () => {
    const { service } = montar({
      aprobaciones: [],
      estudios: [],
      garantias: [{ ...fila('8.4', '2026-09-20'), detalle: 'Póliza 123 · Seguros Andinos' }],
      modificaciones: [{ ...fila('9.5', '2026-09-21'), tipo_modificacion: 'PRORROGA' }],
      pagos: [{ ...fila('9.4', '2026-09-22'), detalle: 'Cuenta de cobro N.º 3' }],
    });

    const lista = await service.porRevisar(acceso);

    expect(lista.map((e) => [e.tipo, e.numeral, e.detalle])).toEqual([
      ['GARANTIA', '8.4', 'Póliza 123 · Seguros Andinos'],
      ['MODIFICACION', '9.5', expect.any(String)],
      ['PAGO', '9.4', 'Cuenta de cobro N.º 3'],
    ]);
  });

  it('sin permiso de aprobar pólizas ni decidir modificaciones no las consulta', async () => {
    const { service, consultas } = montar({ aprobaciones: [], estudios: [] }, () => false);

    await service.porRevisar(acceso);

    expect(consultas.some((c) => c.includes('FROM hiring.garantias'))).toBe(false);
    expect(consultas.some((c) => c.includes('FROM hiring.modificaciones_contrato'))).toBe(false);
    // El aval no es de permiso sino de persona: se consulta igual.
    expect(consultas.some((c) => c.includes('FROM hiring.pagos_contrato'))).toBe(true);
  });
});
