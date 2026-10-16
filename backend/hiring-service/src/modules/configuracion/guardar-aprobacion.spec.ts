import { ConfiguracionService } from './configuracion.service';

/**
 * Configurar la aprobación de una actividad (EFDS-1183, 111).
 *
 * Desde la 111 no se escribe en las reglas: se escribe en el borrador del
 * flujo, que rige cuando se activa. Aquí se comprueba que la ficha traduce lo
 * que pide la pantalla a la forma que guarda el flujo.
 */
describe('ConfiguracionService · guardarAprobacion', () => {
  const montar = () => {
    const flujo = {
      guardarAsignacion: jest.fn(async () => undefined),
      asignacion: jest.fn(async () => ({
        laHace: { tipo: 'PERMISO' },
        aprobacion: { tipo: 'NINGUNA' },
        propiaDeLaModalidad: { laHace: false, aprobacion: false },
        editando: 'BORRADOR',
      })),
    };
    const srv = new ConfiguracionService({ query: jest.fn(async () => []) } as never, flujo as never);
    return { srv, flujo };
  };

  it('un escalón de roles se guarda en el borrador, como en cualquier actividad (también la 3.1)', async () => {
    const { srv, flujo } = montar();

    await srv.guardarAprobacion('3.1', { requiereAprobacion: true, roles: ['DIRECTOR_CONTRATACION'] } as never);

    expect(flujo.guardarAsignacion).toHaveBeenCalledWith(
      '3.1',
      null,
      { aprobacion: { tipo: 'ESCALON', roles: ['DIRECTOR_CONTRATACION'], personas: [], puestos: [] } },
      expect.anything(),
    );
  });

  it('retirarla es «no requiere»', async () => {
    const { srv, flujo } = montar();

    await srv.guardarAprobacion('3.1', { requiereAprobacion: false } as never);

    expect(flujo.guardarAsignacion).toHaveBeenCalledWith('3.1', null, { aprobacion: { tipo: 'NINGUNA' } }, expect.anything());
  });

  it('una cadena se guarda como cadena', async () => {
    const { srv, flujo } = montar();

    await srv.guardarAprobacion('5.9', { requiereAprobacion: true, cadenaId: 'c-1' } as never);

    expect(flujo.guardarAsignacion).toHaveBeenCalledWith('5.9', null, { aprobacion: { tipo: 'CADENA', cadenaId: 'c-1' } }, expect.anything());
  });

  it('en una modalidad, «usar la general» deja de reemplazarla', async () => {
    const { srv, flujo } = montar();

    await srv.guardarAprobacion('5.9', { requiereAprobacion: true, modalidad: 'MINIMA_CUANTIA', usarGeneral: true } as never);

    expect(flujo.guardarAsignacion).toHaveBeenCalledWith('5.9', 'MINIMA_CUANTIA', { aprobacion: null }, expect.anything());
  });
});
