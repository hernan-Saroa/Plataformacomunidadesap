import { saltarPlazosDePrueba, TrasladoService } from './traslado.service';

/**
 * Parámetro de solo pruebas para saltar los plazos de espera (EFDS-2064).
 *
 * Dos condiciones y ninguna sola basta: la variable de entorno tiene que
 * estar encendida Y el entorno no puede ser 'production'. Así un despliegue
 * que arrastre la variable por error no deja el plazo saltado en producción.
 */
function servicio() {
  return new TrasladoService({ manager: {} } as any);
}

describe('saltarPlazosDePrueba', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('apagado por defecto', () => {
    delete process.env.CONTRATACION_SALTAR_PLAZOS;
    expect(saltarPlazosDePrueba()).toBe(false);
  });

  it('encendido con la variable en un entorno que no es producción', () => {
    process.env.CONTRATACION_SALTAR_PLAZOS = 'true';
    process.env.NODE_ENV = 'development';
    expect(saltarPlazosDePrueba()).toBe(true);
  });

  it('nunca se enciende en producción, aunque la variable esté puesta', () => {
    process.env.CONTRATACION_SALTAR_PLAZOS = 'true';
    process.env.NODE_ENV = 'production';
    expect(saltarPlazosDePrueba()).toBe(false);
  });

  it('un valor distinto de "true" no lo enciende', () => {
    process.env.CONTRATACION_SALTAR_PLAZOS = '1';
    process.env.NODE_ENV = 'development';
    expect(saltarPlazosDePrueba()).toBe(false);
  });
});

describe('estaVencido', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('sin fecha de vencimiento no hay término que dar por vencido', () => {
    delete process.env.CONTRATACION_SALTAR_PLAZOS;
    expect((servicio() as any).estaVencido(null)).toBe(false);
  });

  it('con el parámetro apagado, respeta la fecha real', () => {
    delete process.env.CONTRATACION_SALTAR_PLAZOS;
    const futuro = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect((servicio() as any).estaVencido(futuro)).toBe(false);
  });

  it('con el parámetro encendido, un plazo futuro se trata como vencido', () => {
    process.env.CONTRATACION_SALTAR_PLAZOS = 'true';
    process.env.NODE_ENV = 'development';
    const futuro = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    expect((servicio() as any).estaVencido(futuro)).toBe(true);
  });
});
