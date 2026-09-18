import { rubroResultante } from './cdp.service';

/**
 * Con qué rubro se queda el CDP entre la verificación (4.2) y la expedición
 * (4.3).
 *
 * Antes de la 073 no se quedaba con ninguno: la solicitud nace sola y sin
 * rubro, el DTO de expedir no tenía el campo, y el certificado salía sin decir
 * qué partida afectaba. Un CDP así no se puede conciliar con la ejecución
 * presupuestal, que es contra lo que un ente de control lo compara.
 *
 * Se prueba sobre la función pura y no contra la base, como el resto de las
 * reglas del ciclo: qué rubro prevalece es una decisión del flujo y tiene que
 * poder fijarse aquí.
 */
describe('rubroResultante', () => {
  it('toma el que llega cuando el CDP no tenía ninguno', () => {
    // El caso normal desde que la 4.1 la radica el sistema: la solicitud
    // automática nace sin rubro porque el estudio previo no lo captura.
    expect(rubroResultante('A-02-02-02-008', null)).toBe('A-02-02-02-008');
  });

  it('conserva el verificado cuando al expedir no se manda nada', () => {
    // Omitir el campo al expedir no es borrarlo: el certificado sale contra lo
    // que la Financiera ya había verificado.
    expect(rubroResultante(undefined, 'A-02-02-02-008')).toBe('A-02-02-02-008');
  });

  it('el que llega corrige al que ya estaba', () => {
    // Al buscar el saldo la Financiera puede acabar imputando a otro rubro, y
    // el certificado tiene que decir el que de verdad afectó.
    expect(rubroResultante('A-03-03-01-001', 'A-02-02-02-008')).toBe('A-03-03-01-001');
  });

  it('en blanco es no haber escrito nada, no haber escrito «ningún rubro»', () => {
    // Un campo que llega vacío o con espacios viene de un formulario que no se
    // tocó. Dejarlo ganar borraría el rubro verificado.
    expect(rubroResultante('', 'A-02-02-02-008')).toBe('A-02-02-02-008');
    expect(rubroResultante('   ', 'A-02-02-02-008')).toBe('A-02-02-02-008');
  });

  it('limpia los espacios de alrededor', () => {
    // El rubro se compara y se concilia como texto: uno con espacios no casa
    // con el mismo sin ellos.
    expect(rubroResultante('  A-02-02-02-008 ', null)).toBe('A-02-02-02-008');
  });

  it('sin ninguno de los dos devuelve null, que es lo que el servicio pide', () => {
    // No inventa uno ni deja pasar el hueco: el servicio lo traduce en pedirlo,
    // y la restricción de la 073 lo impediría de todos modos al expedir.
    expect(rubroResultante(undefined, null)).toBeNull();
    expect(rubroResultante('  ', null)).toBeNull();
  });
});
