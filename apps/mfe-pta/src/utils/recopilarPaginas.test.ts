import { describe, expect, it, vi } from 'vitest';
import { recopilarTodasLasPaginas } from './recopilarPaginas';

describe('recopilarTodasLasPaginas', () => {
  it('une todas las páginas en orden', async () => {
    const cargar = vi.fn(async (p: number) => ({ items: [`a${p}`, `b${p}`], pages: 3 }));
    expect(await recopilarTodasLasPaginas(cargar)).toEqual(['a1', 'b1', 'a2', 'b2', 'a3', 'b3']);
    expect(cargar).toHaveBeenCalledTimes(3);
  });
  it('con una sola página (o sin dato de páginas) lee una vez', async () => {
    const cargar = vi.fn(async () => ({ items: ['x'], pages: 0 }));
    expect(await recopilarTodasLasPaginas(cargar)).toEqual(['x']);
    expect(cargar).toHaveBeenCalledTimes(1);
  });
  it('falla con mensaje claro si una página no carga (no exporta datos incompletos)', async () => {
    const cargar = async (p: number) => (p === 2 ? null : { items: ['x'], pages: 3 });
    await expect(recopilarTodasLasPaginas(cargar)).rejects.toThrow('página 2');
  });
  it('respeta el máximo de páginas', async () => {
    const cargar = vi.fn(async () => ({ items: ['x'], pages: 999 }));
    expect(await recopilarTodasLasPaginas(cargar, 5)).toHaveLength(5);
  });
});
