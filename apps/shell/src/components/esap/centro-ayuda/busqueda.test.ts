import { describe, expect, it, vi } from 'vitest';
import type { RecursoCentroAyuda } from '../../../services/api/centroAyuda.service';
import { buscarRecursos, normalizar } from './busqueda';

// apiClient abre IndexedDB al importarse; aquí no hace falta (igual que en authService.usuariosPorRoles.test.ts)
vi.mock('../../../services/api/apiClient', () => ({ apiClient: {} }));

const recurso = (datos: Partial<RecursoCentroAyuda>): RecursoCentroAyuda => ({
  id: 1,
  categoria: 'documentacion',
  titulo: 'Recurso',
  descripcion: null,
  modulo: null,
  contenido: null,
  enlace: null,
  version: null,
  orden: 0,
  activo: true,
  archivo: null,
  actualizadoEn: '2026-10-27T00:00:00Z',
  ...datos,
});

const recursos = [
  recurso({ id: 1, titulo: 'Matriz del flujo de gestión contractual', modulo: 'Contratación' }),
  recurso({ id: 2, categoria: 'videos', titulo: 'Cómo ingresar a la plataforma', descripcion: 'Paso a paso para iniciar sesión' }),
  recurso({ id: 3, categoria: 'atajos', titulo: 'Búsqueda global', contenido: 'Ctrl + K' }),
  recurso({
    id: 4,
    categoria: 'manual',
    titulo: 'Manual del sistema',
    archivo: { nombre: 'Guía rápida.pdf', mime: 'application/pdf', tamano: 10, esVideo: false, previsualizable: true },
  }),
];

const ids = (lista: RecursoCentroAyuda[]) => lista.map((r) => r.id);

describe('buscarRecursos', () => {
  it('no distingue tildes ni mayúsculas', () => {
    expect(ids(buscarRecursos(recursos, 'GESTION'))).toEqual([1]);
    expect(ids(buscarRecursos(recursos, 'contratacion'))).toEqual([1]);
  });

  it('exige todas las palabras, en cualquier orden', () => {
    expect(ids(buscarRecursos(recursos, 'plataforma ingresar'))).toEqual([2]);
    expect(ids(buscarRecursos(recursos, 'plataforma contrato'))).toEqual([]);
  });

  it('busca también en la descripción, el texto, el archivo y el nombre de la opción', () => {
    expect(ids(buscarRecursos(recursos, 'sesion'))).toEqual([2]);
    expect(ids(buscarRecursos(recursos, 'ctrl'))).toEqual([3]);
    expect(ids(buscarRecursos(recursos, 'guia rapida'))).toEqual([4]);
    expect(ids(buscarRecursos(recursos, 'video tutoriales'))).toEqual([2]);
  });

  it('con la búsqueda vacía devuelve todo', () => {
    expect(buscarRecursos(recursos, '   ')).toHaveLength(4);
  });
});

describe('normalizar', () => {
  it('quita tildes y pasa a minúsculas', () => {
    expect(normalizar('  Ñandú Guía ')).toBe('nandu guia');
  });
});
