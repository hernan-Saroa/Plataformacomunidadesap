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
    revisionesPaa?: any[];
  },
  /** Lo que la matriz de permisos le deja a quien consulta. */
  permite: (accion: string, numeral: string) => boolean = () => true,
) {
  const consultas: string[] = [];
  const dataSource = {
    query: jest.fn(async (sql: string) => {
      consultas.push(sql);
      // Lo que espera un escalón de la cadena (migración 101).
      if (sql.includes('aprobacion_escalones')) return filas.aprobaciones;
      if (sql.includes('FROM hiring.garantias')) return filas.garantias ?? [];
      if (sql.includes('FROM hiring.modificaciones_contrato')) return filas.modificaciones ?? [];
      if (sql.includes('FROM hiring.pagos_contrato')) return filas.pagos ?? [];
      if (sql.includes('FROM hiring.paa_revisiones')) return filas.revisionesPaa ?? [];
      if (sql.includes('participaciones_proceso')) return filas.estudios;
      return [];
    }),
  };
  const alcance = { puedeEn: jest.fn(async (_a: unknown, accion: string, numeral: string) => permite(accion, numeral)) };
  const service = new AlertasService(dataSource as never, {} as never, alcance as never);
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
  it('la 3.1 sale de su ronda, como estudio previo, desde el escalón que espera', async () => {
    // Desde la 109 la revisión del estudio previo es siempre una ronda: ya no
    // hay una consulta aparte del abogado repartido.
    const { service, consultas } = montar({ aprobaciones: [fila('3.1', '2026-09-20')], estudios: [] });

    const lista = await service.porRevisar(acceso);

    expect(lista.map((e) => [e.tipo, e.numeral])).toEqual([['ESTUDIO_PREVIO', '3.1']]);
    expect(consultas.some((c) => c.includes("pp.papel = 'ABOGADO'"))).toBe(false);
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

  it('trae las revisiones del PAA, diciendo cuáles detienen el proceso', async () => {
    const { service } = montar({
      aprobaciones: [],
      estudios: [],
      revisionesPaa: [{ ...fila('3.1', '2026-09-20'), actividad: 'Línea retirada del PAA', detalle: 'CHOCO 3 · detiene el proceso' }],
    });

    const lista = await service.porRevisar(acceso);

    expect(lista.map((e) => [e.tipo, e.actividad, e.detalle])).toEqual([
      ['REVISION_PAA', 'Línea retirada del PAA', 'CHOCO 3 · detiene el proceso'],
    ]);
  });

  it('sin abogado, la revisión del PAA es de quien puede decidirlas', async () => {
    const { service, consultas } = montar({ aprobaciones: [], estudios: [] }, (accion, lugar) => !(accion === 'decidir' && lugar === 'PAA.R'));

    await service.porRevisar({ ...acceso, userId: '', userName: '' });

    // Sin usuario y sin permiso de bandeja no hay a quién buscarle revisiones.
    expect(consultas.some((c) => c.includes('FROM hiring.paa_revisiones'))).toBe(false);
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
