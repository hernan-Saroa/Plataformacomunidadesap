import { ValidationOptions, registerDecorator } from 'class-validator';

/**
 * El NIT colombiano y su dígito de verificación (BUG-003 de QA, 14/11).
 *
 * Al registrar una oferta se aceptaba cualquier cosa —cuarenta nueves
 * seguidos— como NIT del oferente. Aquí se exige la forma `900123456-7`: el
 * número, un guion y el dígito de verificación, con a lo sumo 11 caracteres en
 * total y sin puntos ni espacios, y que el dígito sea el que da el cálculo de
 * la DIAN.
 */

/** Pesos de la DIAN, del dígito de las unidades hacia la izquierda. */
const PESOS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];

/** Largo máximo con el guion y el dígito de verificación. */
export const LARGO_MAXIMO_NIT = 11;

/** El dígito de verificación que corresponde a un número de NIT. */
export function digitoVerificacion(numero: string): number {
  const digitos = numero.split('').reverse();
  const suma = digitos.reduce((acc, d, i) => acc + Number(d) * PESOS[i], 0);
  const residuo = suma % 11;
  return residuo > 1 ? 11 - residuo : residuo;
}

/** Qué está mal en el NIT, dicho para quien lo escribe; `null` si está bien. */
export function problemaDelNit(texto: string | null | undefined): string | null {
  const nit = (texto ?? '').trim();
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

/** Decorador de DTO: el campo debe ser un NIT válido con su dígito de verificación. */
export function EsNit(opciones?: ValidationOptions) {
  return (objeto: object, propiedad: string) =>
    registerDecorator({
      name: 'esNit',
      target: objeto.constructor,
      propertyName: propiedad,
      options: opciones,
      validator: {
        validate: (valor: unknown) => typeof valor === 'string' && problemaDelNit(valor) === null,
        defaultMessage: (args) =>
          problemaDelNit(typeof args?.value === 'string' ? args.value : '') ?? 'El NIT no es válido',
      },
    });
}
