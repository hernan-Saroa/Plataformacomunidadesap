import { readFileSync } from 'fs';
import { join } from 'path';

import { Accion, Alcance, alcanceDeLugar, puede } from './alcance';

/**
 * Lo que cada rol puede hacer según la siembra de la migración 083.
 *
 * Antes de la 083 estas reglas se probaban sobre el mapa `ROLES_QUE_OTORGAN`:
 * «el gestor instruye pero no decide», «el supervisor reporta y nadie más».
 * Ahora viven en las filas que la 083 siembra en `hiring.alcances_permiso`, así
 * que se leen del propio SQL y se evalúan con la misma `puede` que usa el
 * guard. Si alguien cambia una fila de la siembra, lo que rompe aquí es la
 * regla de negocio que cambió, con su nombre.
 *
 * Solo la siembra: lo que la entidad cambie después desde la pantalla es suyo.
 */
const SQL = readFileSync(
  join(__dirname, '../../db/migrations/083_permisos_por_etapa_punto_y_accion.sql'),
  'utf8',
);

const SIEMBRA: Record<string, Alcance[]> = {};
for (const [, rol, accion, lugar] of SQL.matchAll(/\('([A-Z_]+)',\s*'(ver|editar|aprobar|decidir)',\s*'([^']+)'\)/g)) {
  (SIEMBRA[rol] ??= []).push(alcanceDeLugar(accion as Accion, lugar));
}

const puedeRol = (rol: string, accion: Accion, lugar?: string) =>
  puede(SIEMBRA[rol] ?? [], accion, lugar);

describe('la siembra de la 083', () => {
  it('se lee entera', () => {
    // Si el patrón dejara de reconocer las filas, todo lo demás pasaría vacío.
    const filas = Object.values(SIEMBRA).reduce((n, a) => n + a.length, 0);
    expect(filas).toBeGreaterThan(120);
    expect(Object.keys(SIEMBRA)).toEqual(
      expect.arrayContaining(['GESTOR_CONTRATACION', 'SUPERVISOR_CONTRATO', 'ORDENADOR_GASTO']),
    );
  });

  describe('el presunto incumplimiento', () => {
    it('lo reporta el supervisor, que es quien constata el hecho', () => {
      expect(puedeRol('SUPERVISOR_CONTRATO', 'editar', 'INC.1')).toBe(true);
    });

    it('ni el gestor ni el ordenador lo reportan', () => {
      expect(puedeRol('GESTOR_CONTRATACION', 'editar', 'INC.1')).toBe(false);
      expect(puedeRol('ORDENADOR_GASTO', 'editar', 'INC.1')).toBe(false);
    });

    it('el gestor instruye el sancionatorio pero no lo decide', () => {
      expect(puedeRol('GESTOR_CONTRATACION', 'editar', 'INC.2')).toBe(true);
      expect(puedeRol('GESTOR_CONTRATACION', 'decidir', 'INC.2')).toBe(false);
    });

    it('el ordenador lo decide pero no lo instruye', () => {
      expect(puedeRol('ORDENADOR_GASTO', 'decidir', 'INC.2')).toBe(true);
      expect(puedeRol('ORDENADOR_GASTO', 'editar', 'INC.2')).toBe(false);
    });

    it('el supervisor reporta pero no tramita ni decide', () => {
      expect(puedeRol('SUPERVISOR_CONTRATO', 'editar', 'INC.2')).toBe(false);
      expect(puedeRol('SUPERVISOR_CONTRATO', 'decidir', 'INC.2')).toBe(false);
    });

    it('el revisor lo consulta y nada más', () => {
      expect(puedeRol('REVISOR_CONTRATACION', 'ver', 'INC.1')).toBe(true);
      expect(puedeRol('REVISOR_CONTRATACION', 'editar', 'INC.1')).toBe(false);
    });
  });

  describe('quien diligencia no aprueba', () => {
    it('el gestor diligencia el estudio previo pero no lo revisa', () => {
      expect(puedeRol('GESTOR_CONTRATACION', 'editar', '3.1')).toBe(true);
      expect(puedeRol('GESTOR_CONTRATACION', 'aprobar', '3.4')).toBe(false);
    });

    it('el revisor aprueba pero no diligencia', () => {
      expect(puedeRol('REVISOR_CONTRATACION', 'aprobar', '3.4')).toBe(true);
      expect(puedeRol('REVISOR_CONTRATACION', 'editar', '3.1')).toBe(false);
    });

    it('quien pide la modificación no la concede', () => {
      expect(puedeRol('GESTOR_CONTRATACION', 'editar', '9.5')).toBe(true);
      expect(puedeRol('GESTOR_CONTRATACION', 'decidir', '9.5')).toBe(false);
      expect(puedeRol('ORDENADOR_GASTO', 'decidir', '9.5')).toBe(true);
    });

    it('en la 9.4 radica uno, avala otro y paga un tercero', () => {
      expect(puedeRol('SUPERVISOR_CONTRATO', 'aprobar', '9.4')).toBe(true);
      expect(puedeRol('SUPERVISOR_CONTRATO', 'decidir', '9.4')).toBe(false);
      expect(puedeRol('ESTRUCTURADOR_FINANCIERO', 'decidir', '9.4')).toBe(true);
      expect(puedeRol('ESTRUCTURADOR_FINANCIERO', 'aprobar', '9.4')).toBe(false);
    });
  });

  describe('la Dirección Financiera', () => {
    it('lee el proceso que certifica (072)', () => {
      expect(puedeRol('ESTRUCTURADOR_FINANCIERO', 'ver', '3.1')).toBe(true);
    });

    it('verifica y expide el CDP, pero no lo solicita', () => {
      expect(puedeRol('ESTRUCTURADOR_FINANCIERO', 'editar', '4.2')).toBe(true);
      expect(puedeRol('ESTRUCTURADOR_FINANCIERO', 'editar', '4.3')).toBe(true);
      expect(puedeRol('ESTRUCTURADOR_FINANCIERO', 'editar', '4.1')).toBe(false);
    });

    it('sigue sin diligenciar el trámite que pide el gasto', () => {
      expect(puedeRol('ESTRUCTURADOR_FINANCIERO', 'editar', '3.1')).toBe(false);
    });
  });

  describe('el estructurador técnico', () => {
    it('elabora el estudio previo y el análisis del sector', () => {
      expect(puedeRol('ESTRUCTURADOR_TECNICO', 'editar', '3.1')).toBe(true);
      expect(puedeRol('ESTRUCTURADOR_TECNICO', 'editar', '3.2')).toBe(true);
    });

    it('no toma de la bandeja: es de las áreas que radican, no de quien recibe', () => {
      expect(puedeRol('ESTRUCTURADOR_TECNICO', 'editar', '3.3')).toBe(false);
    });
  });

  describe('el Ordenador del Gasto', () => {
    it('adjudica, designa y firma por la entidad', () => {
      expect(puedeRol('ORDENADOR_GASTO', 'decidir', '7.4')).toBe(true);
      expect(puedeRol('ORDENADOR_GASTO', 'decidir', '6.2')).toBe(true);
      expect(puedeRol('ORDENADOR_GASTO', 'decidir', '8.1')).toBe(true);
    });

    it('el gestor no adjudica ni firma por la entidad', () => {
      expect(puedeRol('GESTOR_CONTRATACION', 'decidir', '7.4')).toBe(false);
      expect(puedeRol('GESTOR_CONTRATACION', 'decidir', '8.1')).toBe(false);
    });
  });

  it('el ente de control ve todo y no escribe nada', () => {
    expect(puedeRol('ENTE_DE_CONTROL', 'ver', 'TODO')).toBe(true);
    for (const accion of ['editar', 'aprobar', 'decidir'] as Accion[]) {
      expect(puedeRol('ENTE_DE_CONTROL', accion)).toBe(false);
    }
  });

  it('el administrador del módulo no tiene alcance: configura sin trabajar procesos', () => {
    expect(SIEMBRA.ADMINISTRADOR_CONTRATACION).toBeUndefined();
  });
});
