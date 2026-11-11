import { BadRequestException, ValidationError } from '@nestjs/common';

/**
 * Los errores de validación de los formularios, dichos en español.
 *
 * `class-validator` trae sus mensajes en inglés y con el nombre de la
 * propiedad tal como está en el código («fechaDesignacion must be a string»).
 * Un DTO que no escribe su propio mensaje le mostraba eso a quien llenaba el
 * formulario. Aquí se traducen los que nadie escribió; los que el DTO sí
 * escribió pasan tal cual.
 */

const PALABRAS: Record<string, string> = {
  anio: 'año',
  area: 'área',
  articulo: 'artículo',
  categoria: 'categoría',
  codigo: 'código',
  comite: 'comité',
  cuantia: 'cuantía',
  dia: 'día',
  dias: 'días',
  garantia: 'garantía',
  habiles: 'hábiles',
  limite: 'límite',
  linea: 'línea',
  maximo: 'máximo',
  minimo: 'mínimo',
  numero: 'número',
  poliza: 'póliza',
  razon: 'razón',
  region: 'región',
  telefono: 'teléfono',
  termino: 'término',
  tipologia: 'tipología',
  titulo: 'título',
};

/** `fechaDesignacion` → «fecha designación». */
export function nombreDeCampo(propiedad: string): string {
  const palabras = propiedad
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter((p) => p && p !== 'id' && p !== 'ids')
    .map((p) => PALABRAS[p] ?? p.replace(/cion$/, 'ción').replace(/sion$/, 'sión'));
  return palabras.join(' ') || propiedad;
}

/** Los mensajes que trae la librería están en inglés; los propios, no. */
const esDeLaLibreria = (mensaje: string) => /\b(must|should)\b/.test(mensaje);

const numeroEn = (mensaje: string) => mensaje.match(/-?\d+(?:\.\d+)?/)?.[0] ?? '';

/** La regla incumplida, dicha en español con el nombre del campo. */
export function mensajeEnEspanol(regla: string, original: string, propiedad: string): string {
  const campo = `«${nombreDeCampo(propiedad)}»`;
  const quien = /^each value in /.test(original) ? `Cada elemento de ${campo}` : campo;
  const n = numeroEn(original.replace(propiedad, ''));
  switch (regla) {
    case 'isNotEmpty':
    case 'isDefined':
      return `Falta ${campo}`;
    case 'isString':
      return `${quien} debe ser un texto`;
    case 'maxLength':
      return `${quien} admite hasta ${n} caracteres`;
    case 'minLength':
      return `${quien} necesita al menos ${n} caracteres`;
    case 'isLength':
      return `${quien} no tiene la longitud permitida`;
    case 'isBoolean':
      return `${quien} debe ser sí o no`;
    case 'isIn':
    case 'isEnum':
      return `${quien} no es una de las opciones que se pueden elegir`;
    case 'isArray':
      return `${quien} debe ser una lista`;
    case 'arrayNotEmpty':
      return `${quien} no puede quedar sin elementos`;
    case 'arrayMinSize':
      return `${quien} necesita al menos ${n} elementos`;
    case 'arrayMaxSize':
      return `${quien} admite hasta ${n} elementos`;
    case 'isInt':
      return `${quien} debe ser un número entero`;
    case 'isNumber':
    case 'isNumberString':
      return `${quien} debe ser un número`;
    case 'isPositive':
      return `${quien} debe ser mayor que cero`;
    case 'min':
      return `${quien} no puede ser menor que ${n}`;
    case 'max':
      return `${quien} no puede ser mayor que ${n}`;
    case 'isDateString':
    case 'isDate':
      return `${quien} debe ser una fecha válida`;
    case 'isEmail':
      return `${quien} debe ser un correo válido`;
    case 'isUrl':
      return `${quien} debe ser una dirección web válida`;
    case 'isUuid':
      return `${quien} no se reconoce: vuelve a elegirlo de la lista`;
    default:
      return `${quien} no tiene el formato esperado`;
  }
}

const vacio = (valor: unknown) => valor === undefined || valor === null || valor === '';

/**
 * Un mensaje por campo, no uno por regla: a un campo obligatorio que llega
 * vacío le fallan todas sus reglas a la vez, y lo único que hay que decir es
 * que falta.
 */
export function mensajesDeValidacion(errores: ValidationError[]): string[] {
  const mensajes: string[] = [];
  const recorrer = (lista: ValidationError[]) => {
    for (const error of lista) {
      const reglas = Object.entries(error.constraints ?? {});
      const propios = reglas.filter(([, texto]) => !esDeLaLibreria(texto));
      if (propios.length) {
        const deVacio = propios.find(([regla]) => regla === 'isNotEmpty' || regla === 'isDefined');
        mensajes.push(...(vacio(error.value) && deVacio ? [deVacio[1]] : propios.map(([, texto]) => texto)));
      } else if (reglas.length) {
        const [regla, texto] = reglas[0];
        mensajes.push(vacio(error.value) ? `Falta «${nombreDeCampo(error.property)}»` : mensajeEnEspanol(regla, texto, error.property));
      }
      if (error.children?.length) recorrer(error.children);
    }
  };
  recorrer(errores);
  return [...new Set(mensajes)];
}

/** Para el `ValidationPipe`: el mismo 400 de siempre, con los mensajes en español. */
export const errorDeValidacion = (errores: ValidationError[]) => new BadRequestException(mensajesDeValidacion(errores));
