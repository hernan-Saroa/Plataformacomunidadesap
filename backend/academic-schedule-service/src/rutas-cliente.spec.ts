import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

/**
 * §1.1 :: las rutas que declara el cliente existen en el backend.
 *
 * Este defecto ya ocurrió dos veces (el `/api/v1` faltante del MFE; el 404 del
 * portal): el front llama a una ruta que el backend no expone y nadie lo nota
 * hasta que alguien abre la pantalla. Este canario lo cierra por diseño.
 *
 * Dos afirmaciones estáticas (deterministas, sin servicio):
 *   1. cada raíz `/programacion-academica/api/v1/<x>` que usa `catalogoApi` tiene
 *      un `@Controller('<x>')` en el servicio;
 *   2. TODA ruta del módulo en el cliente incluye el prefijo `/api/v1/` — el bug
 *      exacto que ya ocurrió (el `/api/v1` faltante).
 */
const REPO = resolve(process.cwd(), '../..');
const CLIENTE = resolve(REPO, 'apps/mfe-programacion-academica/src/services/api/catalogoApi.ts');
const SRC = resolve(process.cwd(), 'src');

function rutasDelCliente(): string[] {
  const txt = readFileSync(CLIENTE, 'utf8');
  const m = txt.match(/\/programacion-academica\/api\/v1\/[a-z-]+/g) || [];
  return Array.from(new Set(m));
}

function prefijosDeControladores(): Set<string> {
  const prefijos = new Set<string>();
  const walk = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.controller.ts')) {
        const txt = readFileSync(p, 'utf8');
        const cm = txt.match(/@Controller\(\s*['"]([a-z-]+)['"]/);
        if (cm) prefijos.add(cm[1]);
      }
    }
  };
  walk(SRC);
  return prefijos;
}

describe('§1.1 :: rutas del cliente vs controladores del backend', () => {
  it('cada raiz que usa catalogoApi tiene su @Controller', () => {
    const rutas = rutasDelCliente();
    const prefijos = prefijosDeControladores();
    expect(rutas.length).toBeGreaterThan(5); // sanity: extrajo algo

    const faltantes = rutas.filter((r) => {
      const seg = r.split('/').pop()!; // el <x> tras api/v1/
      return !prefijos.has(seg);
    });
    expect(faltantes).toEqual([]);
  });

  it('toda ruta del modulo en el cliente lleva el prefijo /api/v1/', () => {
    const txt = readFileSync(CLIENTE, 'utf8');
    // Cualquier literal que empiece por /programacion-academica debe incluir /api/v1/.
    const paths = txt.match(/\/programacion-academica[a-z0-9/_.-]*/gi) || [];
    expect(paths.length).toBeGreaterThan(5);
    const sinVersion = paths.filter((p) => !p.startsWith('/programacion-academica/api/v1/'));
    expect(sinVersion).toEqual([]);
  });
});
