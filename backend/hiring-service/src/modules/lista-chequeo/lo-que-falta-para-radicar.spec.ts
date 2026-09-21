import { loQueFaltaParaRadicar } from './lista-chequeo.service';
import { porQueNoSePuedeRadicar } from '../estudio-previo/estudio-previo.service';

/**
 * Qué impide radicar en la Dirección de Contratación.
 *
 * El procedimiento manda remitir «los documentos previstos en la lista de
 * chequeo que resulten aplicables, según la modalidad de contratación», y
 * hasta ahora bastaba con el estudio previo: el resto del paquete viajaba por
 * correo, fuera del expediente.
 *
 * Se prueba sobre las funciones puras, como el resto de las reglas del módulo:
 * qué falta y cómo se dice son decisiones del flujo y tienen que poder fijarse
 * sin base de datos delante.
 */
describe('loQueFaltaParaRadicar', () => {
  const memorando = { codigo: 'MEMORANDO_SOLICITUD', obligatorio: true };
  const lista = { codigo: 'LISTA_CHEQUEO', obligatorio: true };
  const idoneidad = { codigo: 'CERTIFICADO_IDONEIDAD', obligatorio: false };

  it('no falta nada cuando están todos los obligatorios', () => {
    expect(
      loQueFaltaParaRadicar([memorando, lista], ['MEMORANDO_SOLICITUD', 'LISTA_CHEQUEO']),
    ).toEqual([]);
  });

  it('nombra los que faltan, no los cuenta', () => {
    // La pantalla y el mensaje del 422 dicen cuáles: «faltan dos documentos»
    // obliga a abrir la lista para saber qué buscar.
    expect(loQueFaltaParaRadicar([memorando, lista], [])).toEqual([memorando, lista]);
  });

  it('lo no obligatorio no traba la radicación', () => {
    // El certificado de idoneidad se exige en la prestación de servicios
    // profesionales, que es una tipología y no una modalidad: el catálogo solo
    // sabe filtrar por modalidad, así que aparece en la lista pero no bloquea.
    expect(loQueFaltaParaRadicar([memorando, idoneidad], ['MEMORANDO_SOLICITUD'])).toEqual([]);
  });

  it('una lista vacía no falta nada', () => {
    // Al revés que `completa` en la 5.1, donde una lista vacía no es actividad
    // terminada sino modalidad sin parametrizar. Aquí el candado se añade a un
    // envío que ya valida lo suyo: si la Dirección desactiva todas las filas,
    // lo que quiere es dejar de exigir el paquete, no trabar la radicación.
    expect(loQueFaltaParaRadicar([], [])).toEqual([]);
  });

  it('lo entregado de más no estorba', () => {
    // El área puede haber cargado algo que la modalidad ya no exige —la lista
    // cambió entre que se armó el paquete y que se envió—. Eso no es un error
    // de la radicación: el documento queda en el expediente.
    expect(loQueFaltaParaRadicar([memorando], ['MEMORANDO_SOLICITUD', 'OTRO'])).toEqual([]);
  });
});

describe('porQueNoSePuedeRadicar', () => {
  it('dice las tres cosas a la vez, no la primera', () => {
    // Antes un ternario elegía entre dos motivos: quien no había adjuntado el
    // estudio previo y tenía campos sin llenar solo se enteraba de lo segundo,
    // corregía y se chocaba con lo primero. Con la lista serían tres viajes.
    const mensaje = porQueNoSePuedeRadicar(2, true, ['Memorando de solicitud']);

    expect(mensaje).toContain('faltan datos obligatorios');
    expect(mensaje).toContain('estudio previo diligenciado y firmado');
    expect(mensaje).toContain('Memorando de solicitud');
  });

  it('con un solo motivo no enumera los otros', () => {
    expect(porQueNoSePuedeRadicar(0, false, ['Lista de chequeo de la modalidad'])).toBe(
      'No se puede radicar todavía: falta por remitir Lista de chequeo de la modalidad.',
    );
  });

  it('nombra todos los documentos que faltan', () => {
    const mensaje = porQueNoSePuedeRadicar(0, false, ['Memorando', 'Lista de chequeo']);

    expect(mensaje).toContain('Memorando');
    expect(mensaje).toContain('Lista de chequeo');
  });

  it('no se queda muda si la llaman con todo en orden', () => {
    expect(porQueNoSePuedeRadicar(0, false, [])).toBe('El estudio previo está listo para radicar');
  });
});
