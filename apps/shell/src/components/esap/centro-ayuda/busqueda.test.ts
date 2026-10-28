import { describe, expect, it, vi } from 'vitest';
import type { RecursoCentroAyuda } from '../../../services/api/centroAyuda.service';
import { buscarRecursos, normalizar } from './busqueda';

// apiClient abre IndexedDB al importarse; aquí no hace falta (igual que en authService.usuariosPorRoles.test.ts)
vi.mock('../../../services/api/apiClient', () => ({ apiClient: {} }));

const recurso = (datos: Partial<RecursoCentroAyuda>): RecursoCentroAyuda => ({
  id: 1,
  idSeccion: 1,
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
  recurso({ id: 2, idSeccion: 2, titulo: 'Cómo ingresar a la plataforma', descripcion: 'Paso a paso para iniciar sesión' }),
  recurso({ id: 3, idSeccion: 3, titulo: 'Búsqueda global', contenido: 'Ctrl + K' }),
  recurso({
    id: 4,
    idSeccion: 4,
    titulo: 'Manual del sistema',
    archivo: { nombre: 'Guía rápida.pdf', mime: 'application/pdf', tamano: 10, esVideo: false, previsualizable: true },
  }),
];

const ids = (lista: RecursoCentroAyuda[]) => lista.map((r) => r.id);

// Las secciones ya no son fijas: el nombre llega de la base de datos.
const SECCIONES: Record<number, string> = { 1: 'Documentación completa', 2: 'Video tutoriales', 3: 'Atajos de teclado', 4: 'Manual de usuario' };
const nombreDeSeccion = (id: number) => SECCIONES[id] ?? '';

describe('buscarRecursos', () => {
  it('no distingue tildes ni mayúsculas', () => {
    expect(ids(buscarRecursos(recursos, 'GESTION'))).toEqual([1]);
    expect(ids(buscarRecursos(recursos, 'contratacion'))).toEqual([1]);
  });

  it('exige todas las palabras, en cualquier orden', () => {
    expect(ids(buscarRecursos(recursos, 'plataforma ingresar'))).toEqual([2]);
    expect(ids(buscarRecursos(recursos, 'plataforma contrato'))).toEqual([]);
  });

  it('busca también en la descripción, el texto, el archivo y el nombre de la sección', () => {
    expect(ids(buscarRecursos(recursos, 'sesion'))).toEqual([2]);
    expect(ids(buscarRecursos(recursos, 'ctrl'))).toEqual([3]);
    expect(ids(buscarRecursos(recursos, 'guia rapida'))).toEqual([4]);
    expect(ids(buscarRecursos(recursos, 'video tutoriales', nombreDeSeccion))).toEqual([2]);
    expect(ids(buscarRecursos(recursos, 'video tutoriales'))).toEqual([]);
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
