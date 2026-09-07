import { evaluarCondiciones, EntradaCondiciones } from './condiciones';

/** Tope de 300 SMMLV con el salario de 2026: 487.050.000 pesos. */
const BASE: EntradaCondiciones = {
  valorProceso: 400_000_000,
  manifestaciones: 3,
  topeValor: 300,
  unidadTope: 'SMMLV',
  smmlv: 1_623_500,
  minimoManifestaciones: 3,
};

describe('evaluarCondiciones', () => {
  it('se cumplen cuando el valor está bajo el tope y hay manifestaciones de sobra', () => {
    const r = evaluarCondiciones(BASE);
    expect(r.valor.cumple).toBe(true);
    expect(r.manifestaciones.cumple).toBe(true);
    expect(r.cumplidas).toBe(true);
    expect(r.topeEnPesos).toBe(487_050_000);
  });

  it('el proceso que vale exactamente el tope sí cumple', () => {
    // El borde que más se equivoca: la norma fija un máximo, no un límite
    // exclusivo, así que igualarlo no descalifica.
    const r = evaluarCondiciones({ ...BASE, valorProceso: 487_050_000 });
    expect(r.valor.cumple).toBe(true);
  });

  it('un peso por encima del tope ya no cumple', () => {
    const r = evaluarCondiciones({ ...BASE, valorProceso: 487_050_001 });
    expect(r.valor.cumple).toBe(false);
    expect(r.cumplidas).toBe(false);
  });

  it('la manifestación número tres alcanza el mínimo', () => {
    expect(evaluarCondiciones({ ...BASE, manifestaciones: 2 }).manifestaciones.cumple).toBe(false);
    expect(evaluarCondiciones({ ...BASE, manifestaciones: 3 }).manifestaciones.cumple).toBe(true);
  });

  it('dice cuántas manifestaciones faltan', () => {
    const r = evaluarCondiciones({ ...BASE, manifestaciones: 1 });
    expect(r.manifestaciones.detalle).toContain('faltan 2');
  });

  it('acepta el tope expresado en pesos, sin salario', () => {
    const r = evaluarCondiciones({
      ...BASE,
      topeValor: 500_000_000,
      unidadTope: 'PESOS',
      smmlv: null,
    });
    expect(r.topeEnPesos).toBe(500_000_000);
    expect(r.valor.cumple).toBe(true);
  });
});

/**
 * "No alcanza el tope" y "no sé cuánto vale el proceso" llevan a decisiones
 * distintas. Colapsarlas en un falso le haría creer a quien decide que la regla
 * ya se comprobó y que el proceso no clasifica.
 */
describe('evaluarCondiciones · datos que faltan', () => {
  it('no opina sobre el valor si el proceso no lo tiene', () => {
    const r = evaluarCondiciones({ ...BASE, valorProceso: null });
    expect(r.valor.cumple).toBeNull();
    expect(r.cumplidas).toBe(false);
    expect(r.valor.detalle).toContain('no tiene valor estimado');
  });

  it('no opina sobre el valor si el tope está en SMMLV y no hay salario', () => {
    const r = evaluarCondiciones({ ...BASE, smmlv: null });
    expect(r.valor.cumple).toBeNull();
    expect(r.topeEnPesos).toBeNull();
    expect(r.cumplidas).toBe(false);
  });

  it('el conteo de manifestaciones se evalúa siempre: no depende de nada externo', () => {
    const r = evaluarCondiciones({ ...BASE, valorProceso: null, smmlv: null });
    expect(r.manifestaciones.cumple).toBe(true);
  });
});
