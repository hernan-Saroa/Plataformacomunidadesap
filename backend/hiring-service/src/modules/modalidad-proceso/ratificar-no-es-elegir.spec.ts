import { estadoTrasDecidirLaModalidad } from './modalidad-proceso.service';

/**
 * Actividad 3.5 · Definir la modalidad (EFDS-1183).
 *
 * La modalidad se elige al crear el proceso, porque de ella depende qué
 * actividades recorre. La 3.5 no la vuelve a elegir: la ratifica. Mientras fue
 * el panel genérico de constancia se daba por definida subiendo un papel, sin
 * que nadie hubiera mirado si la que el área puso era la que correspondía.
 */
describe('decidir la modalidad', () => {
  it('ratificarla la cierra', () => {
    expect(estadoTrasDecidirLaModalidad('APROBADO')).toBe('APROBADO');
  });

  it('devolverla la reabre para que el área la corrija', () => {
    // Y no la deja en BORRADOR sin más: DEVUELTO es lo que le dice al área que
    // hay algo que corregir, y lo que hace que el motivo del abogado se muestre
    // en vez de quedar enterrado en el historial.
    expect(estadoTrasDecidirLaModalidad('DEVUELTO')).toBe('DEVUELTO');
  });

  it('el ciclo se repite: devolver no cierra nada', () => {
    // «Hasta que el abogado la apruebe»: devolver deja la actividad abierta
    // tantas veces como haga falta, sin desenlace que la termine.
    expect(estadoTrasDecidirLaModalidad('DEVUELTO')).not.toBe('APROBADO');
    expect(estadoTrasDecidirLaModalidad('DEVUELTO')).not.toBe('NEGADO');
  });
});
