import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Ningún diálogo del navegador en el módulo: todo va por `useDialogo`.
 *
 * El cuadro «localhost dice…» no se puede maquetar, no valida y en la prueba
 * con el navegador automatizado deja la pestaña colgada. La migración a
 * `useDialogo` dejó dos sin cambiar (devolver una póliza y rechazar el RP)
 * porque estaban partidos en dos líneas —`window` y debajo `.prompt(`— y la
 * búsqueda los pasó por alto. Esta prueba los busca de cualquier forma.
 */
const RAIZ = join(__dirname, '..', '..');

function archivosDe(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivosDe(ruta);
    return /\.(ts|tsx)$/.test(nombre) && !/\.test\.(ts|tsx)$/.test(nombre) ? [ruta] : [];
  });
}

/** Quita comentarios para no contar los que cuentan la historia del cambio. */
const sinComentarios = (codigo: string) =>
  codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

const DIALOGO_NATIVO = /(?:\bwindow|\bglobalThis|\bself)\s*\.\s*(?:prompt|confirm|alert)\s*\(|(?<![\w.$])(?:prompt|confirm|alert)\s*\(/;

describe('sin diálogos del navegador', () => {
  it('ningún archivo del módulo llama a prompt, confirm o alert', () => {
    const conDialogo = archivosDe(RAIZ)
      .filter((ruta) => DIALOGO_NATIVO.test(sinComentarios(readFileSync(ruta, 'utf-8'))))
      .map((ruta) => relative(RAIZ, ruta));

    expect(conDialogo).toEqual([]);
  });

  it('el patrón atrapa también la llamada partida en dos líneas', () => {
    expect(DIALOGO_NATIVO.test('const m = window\n  .prompt("¿Por qué?")')).toBe(true);
    expect(DIALOGO_NATIVO.test('if (confirm("¿Seguro?")) x()')).toBe(true);
    expect(DIALOGO_NATIVO.test('dialogo.pedirMotivo({ titulo })')).toBe(false);
  });
});
