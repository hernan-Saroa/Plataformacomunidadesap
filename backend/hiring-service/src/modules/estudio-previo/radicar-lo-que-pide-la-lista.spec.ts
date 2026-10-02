import { porQueNoSePuedeRadicar } from './estudio-previo.service';

/**
 * El envío de la 3.1 pide lo que dice la lista de chequeo, y nada más.
 *
 * Antes, con la lista vacía, se exigía además «el estudio previo diligenciado
 * y firmado»; pero con la lista vacía la pantalla no tiene dónde subirlo, y el
 * área quedaba sin salida. El aviso de una lista sin obligatorios va ahora en
 * Configuración.
 */
describe('radicar la 3.1 · lo que pide la lista', () => {
  it('nombra cada documento que falta de la lista', () => {
    expect(porQueNoSePuedeRadicar(0, ['Estudio previo firmado', 'Memorando de solicitud'])).toBe(
      'No se puede radicar todavía: falta por remitir Estudio previo firmado, Memorando de solicitud.',
    );
  });

  it('junta los campos y los documentos en un solo mensaje', () => {
    expect(porQueNoSePuedeRadicar(2, ['Memorando de solicitud'])).toBe(
      'No se puede radicar todavía: faltan datos obligatorios; falta por remitir Memorando de solicitud.',
    );
  });

  it('no pide el estudio previo si la lista no lo pide', () => {
    expect(porQueNoSePuedeRadicar(1, [])).not.toMatch(/estudio previo/i);
  });
});
