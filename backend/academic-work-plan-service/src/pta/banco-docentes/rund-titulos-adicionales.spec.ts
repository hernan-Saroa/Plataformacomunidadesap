import { BadRequestException } from '@nestjs/common';
import { normalizeBancoDocentePayload } from './banco-docentes.service';
import {
  MAX_TITULOS_ADICIONALES_POR_NIVEL,
  leerTitulosAdicionales,
  limpiarTitulosNivel,
  resolverTitulosAdicionales,
  titulosAdicionalesGuardados,
} from './rund-titulos-adicionales';

describe('RUND-003 · varios títulos por nivel de formación', () => {
  describe('limpiarTitulosNivel', () => {
    it('quita vacíos, repetidos (sin tildes ni mayúsculas) y el título precargado', () => {
      expect(limpiarTitulosNivel(['Abogado', ' abogado ', '', 'ECONOMISTA', 'Economista'], 'Economista')).toEqual(['Abogado']);
    });
    it('separa una celda con varios títulos por «;», «|» o salto de línea', () => {
      expect(limpiarTitulosNivel('Abogado; Contador Público | Politólogo\nSociólogo')).toEqual(['Abogado', 'Contador Público', 'Politólogo', 'Sociólogo']);
    });
    it('trata null y valores sin título como lista vacía', () => {
      expect(limpiarTitulosNivel(null)).toEqual([]);
      expect(limpiarTitulosNivel(undefined, 'X')).toEqual([]);
    });
  });

  describe('leerTitulosAdicionales', () => {
    it('devuelve undefined si la solicitud no trae títulos adicionales (no debe borrar los guardados)', () => {
      expect(leerTitulosAdicionales({ TITULO_PREGRADO: 'Economista' }, { pregrado: 'Economista' })).toBeUndefined();
    });
    it('lee el objeto del formulario por nivel y descarta el título precargado', () => {
      expect(leerTitulosAdicionales(
        { titulosAdicionales: { pregrado: ['Economista', 'Abogado'], maestria: ['Magíster en Gobierno'], doctorado: [] } },
        { pregrado: 'Economista' },
      )).toEqual({ pregrado: ['Abogado'], maestria: ['Magíster en Gobierno'] });
    });
    it('lee las columnas de la plantilla de cargue', () => {
      expect(leerTitulosAdicionales(
        { TITULOS_ADICIONALES_PREGRADO: 'Abogado; Contador Público', TITULOS_ADICIONALES_MAESTRIA: '' },
        { pregrado: 'Economista' },
      )).toEqual({ pregrado: ['Abogado', 'Contador Público'] });
    });
    it('un objeto vacío significa "sin títulos adicionales" y reemplaza lo anterior', () => {
      expect(leerTitulosAdicionales({ titulosAdicionales: {} }, {})).toEqual({});
    });
    it('rechaza más títulos de los permitidos por nivel', () => {
      const demasiados = Array.from({ length: MAX_TITULOS_ADICIONALES_POR_NIVEL + 1 }, (_, i) => `Título ${i}`);
      expect(() => leerTitulosAdicionales({ titulosAdicionales: { pregrado: demasiados } }, {})).toThrow(BadRequestException);
    });
    it('rechaza un título demasiado largo', () => {
      expect(() => leerTitulosAdicionales({ titulosAdicionales: { pregrado: ['x'.repeat(301)] } }, {})).toThrow(BadRequestException);
    });
  });

  describe('resolverTitulosAdicionales', () => {
    it('conserva lo guardado cuando la solicitud no trae el dato', () => {
      expect(resolverTitulosAdicionales(undefined, { pregrado: ['Abogado'] })).toEqual({ pregrado: ['Abogado'] });
    });
    it('no inventa un cambio en un registro sin títulos adicionales (null sigue siendo null)', () => {
      expect(resolverTitulosAdicionales({}, null)).toBeNull();
      expect(resolverTitulosAdicionales(undefined, null)).toBeNull();
    });
    it('reemplaza y permite quitar todos los títulos adicionales', () => {
      expect(resolverTitulosAdicionales({ pregrado: ['Politólogo'] }, { pregrado: ['Abogado'] })).toEqual({ pregrado: ['Politólogo'] });
      expect(resolverTitulosAdicionales({}, { pregrado: ['Abogado'] })).toEqual({});
    });
  });

  describe('titulosAdicionalesGuardados', () => {
    it('tolera registros anteriores (null, formatos inesperados)', () => {
      expect(titulosAdicionalesGuardados(null)).toEqual({});
      expect(titulosAdicionalesGuardados([])).toEqual({});
      expect(titulosAdicionalesGuardados({ pregrado: 'no es lista', maestria: ['Magíster'] })).toEqual({ pregrado: ['no es lista'], maestria: ['Magíster'] });
    });
  });

  describe('normalizeBancoDocentePayload', () => {
    it('conserva el título de la plantilla como principal y separa los adicionales', () => {
      const payload = normalizeBancoDocentePayload({
        TITULO_PREGRADO: 'Economista',
        TITULOS_ADICIONALES_PREGRADO: 'Abogado; economista',
      });
      expect(payload.pregrado).toBe('Economista');
      expect(payload.titulosAdicionales).toEqual({ pregrado: ['Abogado'] });
    });
    it('sin columnas de adicionales no los toca', () => {
      expect(normalizeBancoDocentePayload({ TITULO_PREGRADO: 'Economista' }).titulosAdicionales).toBeUndefined();
    });
  });
});
