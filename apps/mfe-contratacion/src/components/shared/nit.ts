/**
 * El NIT y su dígito de verificación, comprobados mientras se escriben (BUG-003).
 *
 * Es la misma regla de `backend/hiring-service/src/validacion/nit.ts`, que es
 * la que manda: aquí solo se adelanta el aviso para no esperar al envío.
 */

/** Pesos de la DIAN, del dígito de las unidades hacia la izquierda. */
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** Largo máximo con el guion y el dígito de verificación. */
export const LARGO_MAXIMO_NIT = 11;

export function digitoVerificacion(numero: string): number {
  const suma = numero
    .split('')
    .reverse()
    .reduce((acc, d, i) => acc + Number(d) * PESOS[i], 0);
  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

/** Qué está mal en el NIT, dicho para quien lo escribe; `null` si está bien. */
export function problemaDelNit(texto: string): string | null {
  const nit = texto.trim();
  if (!nit) return 'Indica el NIT del oferente';
  if (/[.\s,]/.test(nit)) return 'Escribe el NIT sin puntos ni espacios, por ejemplo 900123456-7';
  if (nit.length > LARGO_MAXIMO_NIT) {
    return `El NIT tiene a lo sumo ${LARGO_MAXIMO_NIT} caracteres con el guion y el dígito de verificación`;
  }
  const partes = /^(\d{3,9})-(\d)$/.exec(nit);
  if (!partes) {
    return 'El NIT va con su dígito de verificación separado por un guion, por ejemplo 900123456-7';
  }
  const esperado = digitoVerificacion(partes[1]);
  if (Number(partes[2]) !== esperado) {
    return `El dígito de verificación no corresponde al NIT ${partes[1]}: debería ser ${esperado}`;
  }
  return null;
}
