import { ValidationError } from '@nestjs/common';
import { mensajeEnEspanol, mensajesDeValidacion, nombreDeCampo } from './mensajes-validacion';

const error = (property: string, value: unknown, constraints: Record<string, string>, children: ValidationError[] = []) =>
  ({ property, value, constraints, children }) as ValidationError;

describe('los errores de validación, en español', () => {
  it('el nombre del campo se dice con palabras', () => {
    expect(nombreDeCampo('fechaDesignacion')).toBe('fecha designación');
    expect(nombreDeCampo('numeroPoliza')).toBe('número póliza');
    expect(nombreDeCampo('personaId')).toBe('persona');
  });

  it('traduce la regla con su número', () => {
    expect(mensajeEnEspanol('maxLength', 'motivo must be shorter than or equal to 1000 characters', 'motivo')).toBe(
      '«motivo» admite hasta 1000 caracteres',
    );
    expect(mensajeEnEspanol('min', 'dias2 must not be less than 0', 'dias2')).toBe('«dias2» no puede ser menor que 0');
    expect(mensajeEnEspanol('isString', 'each value in correos must be a string', 'correos')).toBe(
      'Cada elemento de «correos» debe ser un texto',
    );
  });

  it('un campo obligatorio vacío solo dice que falta', () => {
    const errores = [
      error('motivo', undefined, {
        isString: 'motivo must be a string',
        maxLength: 'motivo must be shorter than or equal to 1000 characters',
        isNotEmpty: 'motivo should not be empty',
      }),
    ];
    expect(mensajesDeValidacion(errores)).toEqual(['Falta «motivo»']);
  });

  it('el mensaje que escribió el DTO pasa tal cual y manda sobre los de la librería', () => {
    const errores = [
      error('motivo', '', { isString: 'motivo must be a string', isNotEmpty: 'Explica por qué se revoca la designación' }),
      error('fecha', 'ayer', { isDateString: 'La fecha debe tener formato AAAA-MM-DD' }),
    ];
    expect(mensajesDeValidacion(errores)).toEqual(['Explica por qué se revoca la designación', 'La fecha debe tener formato AAAA-MM-DD']);
  });

  it('baja a los campos anidados y no repite', () => {
    const hijo = () => error('nombre', 7, { isString: 'nombre must be a string' });
    const errores = [error('miembros', [], {}, [error('0', {}, {}, [hijo()]), error('1', {}, {}, [hijo()])])];
    expect(mensajesDeValidacion(errores)).toEqual(['«nombre» debe ser un texto']);
  });
});
