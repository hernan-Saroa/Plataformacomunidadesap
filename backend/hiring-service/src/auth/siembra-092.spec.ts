import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

import { Accion, Alcance, alcanceDeLugar, puede } from './alcance';

/**
 * Los roles de Contratación, desde cero (migración 092).
 *
 * Como la prueba de la 083, se lee el propio SQL y se evalúa con la misma
 * `puede` del guard. Además se cruza con los controladores: el flujo completo
 * solo se puede recorrer si cada acción que exige un endpoint la tiene algún
 * rol del módulo —sin contar al SUPER_ADMIN, que lo puede todo y taparía el
 * hueco—.
 */
const SQL = readFileSync(
  join(__dirname, '../../db/migrations/092_roles_de_contratacion_desde_cero.sql'),
  'utf8',
);

const SIEMBRA: Record<string, Alcance[]> = {};
for (const [, rol, accion, lugar] of SQL.matchAll(
  /\('([A-Z_]+)',\s*'(ver|editar|aprobar|decidir)',\s*'([^']+)'\)/g,
)) {
  (SIEMBRA[rol] ??= []).push(alcanceDeLugar(accion as Accion, lugar));
}

const puedeRol = (rol: string, accion: Accion, lugar?: string) =>
  puede(SIEMBRA[rol] ?? [], accion, lugar);

/**
 * Los `@Puede(acciones, 'lugar')` de todos los controladores, con lugar fijo.
 *
 * Con varias acciones basta cualquiera: el guard deja pasar con una.
 */
function exigenciasDeLosEndpoints(): { acciones: Accion[]; lugar: string }[] {
  const archivos: string[] = [];
  const recorrer = (dir: string) => {
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (nombre.endsWith('.controller.ts')) archivos.push(ruta);
    }
  };
  recorrer(join(__dirname, '../modules'));

  const exigencias: { acciones: Accion[]; lugar: string }[] = [];
  for (const archivo of archivos) {
    const fuente = readFileSync(archivo, 'utf8');
    for (const [, acciones, lugar] of fuente.matchAll(
      /@Puede\(\s*(\[[^\]]*\]|'[a-z]+')\s*,\s*'([^']+)'/g,
    )) {
      exigencias.push({
        acciones: [...acciones.matchAll(/'([a-z]+)'/g)].map((m) => m[1] as Accion),
        lugar,
      });
    }
  }
  return exigencias;
}

describe('la siembra de la 092', () => {
  it('se lee entera y trae los roles del flujo', () => {
    const filas = Object.values(SIEMBRA).reduce((n, a) => n + a.length, 0);
    expect(filas).toBeGreaterThan(130);
    expect(Object.keys(SIEMBRA)).toEqual(
      expect.arrayContaining([
        'ESTRUCTURADOR_TECNICO',
        'GESTOR_CONTRATACION',
        'REVISOR_CONTRATACION',
        'DIRECTOR_CONTRATACION',
        'ESTRUCTURADOR_FINANCIERO',
        'ORDENADOR_GASTO',
        'SUPERVISOR_CONTRATO',
        'EVALUADOR_TECNICO',
        'ARCHIVO_GESTION_DC',
      ]),
    );
  });

  it('no siembra al SUPER_ADMIN: es de toda la plataforma', () => {
    expect(SIEMBRA.SUPER_ADMIN).toBeUndefined();
  });

  it('cada acción que exige un endpoint la tiene algún rol del módulo', () => {
    const exigencias = exigenciasDeLosEndpoints();
    expect(exigencias.length).toBeGreaterThan(80);

    const sinQuien = exigencias.filter(
      (e) =>
        !Object.keys(SIEMBRA).some((rol) => e.acciones.some((a) => puedeRol(rol, a, e.lugar))),
    );

    expect(sinQuien.map((e) => `${e.acciones.join('/')} ${e.lugar}`)).toEqual([]);
  });

  it('ya no siembra la 3.2: se entrega con la 3.1 desde la 090', () => {
    expect(SQL).not.toMatch(/'3\.2'\)/);
  });

  describe('quién hace qué en el flujo', () => {
    it('el área redacta el estudio previo y no lo revisa', () => {
      expect(puedeRol('ESTRUCTURADOR_TECNICO', 'editar', '3.1')).toBe(true);
      expect(puedeRol('ESTRUCTURADOR_TECNICO', 'aprobar', '3.4')).toBe(false);
    });

    it('el gestor recibe de la bandeja, y el abogado revisa sin diligenciar', () => {
      expect(puedeRol('GESTOR_CONTRATACION', 'editar', '3.3')).toBe(true);
      expect(puedeRol('REVISOR_CONTRATACION', 'aprobar', '3.4')).toBe(true);
      expect(puedeRol('REVISOR_CONTRATACION', 'editar', '3.1')).toBe(false);
    });

    it('la Financiera expide el CDP y el RP, y paga', () => {
      expect(puedeRol('ESTRUCTURADOR_FINANCIERO', 'editar', '4.3')).toBe(true);
      expect(puedeRol('ESTRUCTURADOR_FINANCIERO', 'decidir', '8.3')).toBe(true);
      expect(puedeRol('ESTRUCTURADOR_FINANCIERO', 'decidir', '9.4')).toBe(true);
    });

    it('el ordenador adjudica y firma, y puede leer lo que firma', () => {
      expect(puedeRol('ORDENADOR_GASTO', 'decidir', '7.4')).toBe(true);
      expect(puedeRol('ORDENADOR_GASTO', 'decidir', '8.1')).toBe(true);
      expect(puedeRol('ORDENADOR_GASTO', 'ver', '7.3')).toBe(true);
      expect(puedeRol('ORDENADOR_GASTO', 'ver', '8.4')).toBe(true);
    });

    it('el gestor proyecta pero no adjudica ni paga', () => {
      expect(puedeRol('GESTOR_CONTRATACION', 'editar', '7.4')).toBe(true);
      expect(puedeRol('GESTOR_CONTRATACION', 'decidir', '7.4')).toBe(false);
      expect(puedeRol('GESTOR_CONTRATACION', 'decidir', '9.4')).toBe(false);
    });

    it('el supervisor avala la cuenta y ve el contrato que vigila', () => {
      expect(puedeRol('SUPERVISOR_CONTRATO', 'aprobar', '9.4')).toBe(true);
      expect(puedeRol('SUPERVISOR_CONTRATO', 'ver', '8.1')).toBe(true);
    });

    it('el comité registra la evaluación y nada antes', () => {
      expect(puedeRol('EVALUADOR_JURIDICO', 'editar', '6.3')).toBe(true);
      expect(puedeRol('EVALUADOR_JURIDICO', 'ver', '3.1')).toBe(false);
    });

    it('el ente de control consulta todo y no modifica nada', () => {
      expect(puedeRol('ENTE_DE_CONTROL', 'ver', '9.4')).toBe(true);
      expect(puedeRol('ENTE_DE_CONTROL', 'editar', '9.4')).toBe(false);
    });
  });

  describe('los transversales', () => {
    it('ver todos los procesos es solo del Director', () => {
      const conVerTodos = [...SQL.matchAll(/\('([A-Z_]+)',\s*'contratacion\.proceso\.view-all'\)/g)].map(
        (m) => m[1],
      );
      expect(conVerTodos).toEqual(['DIRECTOR_CONTRATACION']);
    });

    it('no toca las asignaciones de usuarios', () => {
      expect(SQL).not.toMatch(/DELETE FROM auth\.user_roles/i);
      expect(SQL).not.toMatch(/DELETE FROM auth\.role\b/i);
    });
  });
});
