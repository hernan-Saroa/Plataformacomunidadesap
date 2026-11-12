import { BadRequestException } from '@nestjs/common';
import { decidirTituloSoporte, NIVEL_POR_SOPORTE_TITULO } from './rund-titulo-soporte';

describe('decidirTituloSoporte', () => {
  it('sin título del nivel, el escrito pasa a ser el título precargado', () => {
    expect(decidirTituloSoporte(null, [], '  Maestría en Gobierno ')).toEqual({
      destino: 'principal', principal: 'Maestría en Gobierno', adicionales: [], titulo: 'Maestría en Gobierno',
    });
    expect(decidirTituloSoporte('No registrado', [], 'Maestría 1').destino).toBe('principal');
  });

  it('con título precargado, el nuevo se suma a los adicionales sin perder el orden', () => {
    const decision = decidirTituloSoporte('Pregrado A', ['Pregrado B'], 'Pregrado C');
    expect(decision.destino).toBe('adicional');
    expect(decision.principal).toBe('Pregrado A');
    expect(decision.adicionales).toEqual(['Pregrado B', 'Pregrado C']);
  });

  it('un título repetido (sin tildes ni mayúsculas) se rechaza: el documento se carga desde la fila de ese título', () => {
    expect(() => decidirTituloSoporte('Administración Pública', [], 'administracion publica')).toThrow(/ya está registrado/);
    expect(() => decidirTituloSoporte('A', ['Gestión'], 'GESTION')).toThrow(/ya está registrado/);
  });

  it('rechaza título vacío, demasiado largo y más de 10 adicionales', () => {
    expect(() => decidirTituloSoporte('A', [], '   ')).toThrow(BadRequestException);
    expect(() => decidirTituloSoporte('A', [], 'x'.repeat(301))).toThrow(BadRequestException);
    const diez = Array.from({ length: 10 }, (_, i) => `Título ${i}`);
    expect(() => decidirTituloSoporte('A', diez, 'Otro')).toThrow(BadRequestException);
  });

  it('solo los diplomas de nivel registran título', () => {
    expect(NIVEL_POR_SOPORTE_TITULO).toEqual({
      diploma_pregrado: 'pregrado', diploma_especializacion: 'especializacion', diploma_maestria: 'maestria',
      diploma_doctorado: 'doctorado', certificado_posdoctoral: 'posDoctorado',
    });
    expect(NIVEL_POR_SOPORTE_TITULO.diploma_bachiller).toBeUndefined();
  });
});
