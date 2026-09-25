import { afterEach, describe, expect, it } from 'vitest';

import {
  cubre,
  esSoloPresupuesto,
  fijarAlcance,
  olvidarAlcance,
  puede,
  puedeEn,
  tieneTransversal,
} from './alcance';
import { AlcanceVista } from '../types';

/**
 * La misma regla que el guard del servicio (migración 083).
 *
 * Estos casos son los del `alcance.spec.ts` del backend: si uno de los dos
 * lados cambia, la pantalla empezaría a ofrecer lo que la API niega.
 */
const legal: AlcanceVista[] = [
  { accion: 'ver', lugar: 'E3' },
  { accion: 'ver', lugar: 'E4' },
  { accion: 'ver', lugar: '7.2' },
];

describe('puede', () => {
  it('el área Legal ve la 3 y la 4 enteras y de la 7 solo la 7.2', () => {
    expect(puede(legal, 'ver', '3.7')).toBe(true);
    expect(puede(legal, 'ver', '4.3')).toBe(true);
    expect(puede(legal, 'ver', '7.2')).toBe(true);
    expect(puede(legal, 'ver', '7.1')).toBe(false);
    expect(puede(legal, 'editar', '3.1')).toBe(false);
  });

  it('un punto no es un prefijo, ni la etapa 1 cubre la 10', () => {
    expect(puede([{ accion: 'ver', lugar: '7.2' }], 'ver', '7.20')).toBe(false);
    expect(puede([{ accion: 'ver', lugar: 'E1' }], 'ver', '10.2')).toBe(false);
  });

  it('editar, aprobar o decidir implican ver, pero no entre ellas', () => {
    const financiera: AlcanceVista[] = [{ accion: 'decidir', lugar: '9.4' }];
    expect(puede(financiera, 'ver', '9.4')).toBe(true);
    expect(puede(financiera, 'aprobar', '9.4')).toBe(false);
  });

  it('el incumplimiento no cuelga de la etapa 9', () => {
    expect(cubre('E9', 'INC.1')).toBe(false);
    expect(cubre('INC.1', 'INC.2')).toBe(false);
    expect(cubre('TODO', 'INC.2')).toBe(true);
  });

  it('una etapa entera solo la cubre una fila de etapa', () => {
    expect(cubre('10.2', 'E10')).toBe(false);
    expect(cubre('E10', 'E10')).toBe(true);
    expect(cubre('E3', 'TODO')).toBe(false);
  });

  it('sin destino basta con tenerla en alguna parte', () => {
    expect(puede(legal, 'ver')).toBe(true);
    expect(puede(legal, 'editar')).toBe(false);
  });
});

describe('puedeEn y tieneTransversal', () => {
  afterEach(() => {
    olvidarAlcance();
    localStorage.clear();
  });

  it('mientras el alcance no llega, responde que sí', () => {
    // Una pantalla vacía sin explicación es peor que un botón de más: el
    // guard sigue negando.
    expect(puedeEn('editar', '4.2')).toBe(true);
  });

  it('con el alcance, responde por él', () => {
    fijarAlcance({ alcances: legal, transversales: [] });

    expect(puedeEn('ver', '7.2')).toBe(true);
    expect(puedeEn('ver', '7.1')).toBe(false);
  });

  it('los transversales salen del alcance cuando ya llegó', () => {
    fijarAlcance({ alcances: [], transversales: ['contratacion.config.manage'] });

    expect(tieneTransversal('contratacion.config.manage')).toBe(true);
    expect(tieneTransversal('contratacion.reporte.view')).toBe(false);
  });
});

describe('esSoloPresupuesto', () => {
  afterEach(() => olvidarAlcance());

  it('la Financiera, aunque apruebe el respaldo de la 9.5', () => {
    fijarAlcance({
      alcances: [
        { accion: 'editar', lugar: '4.2' },
        { accion: 'editar', lugar: '4.3' },
        { accion: 'aprobar', lugar: '9.5' },
        { accion: 'decidir', lugar: '9.4' },
      ],
      transversales: [],
    });
    expect(esSoloPresupuesto()).toBe(true);
  });

  it('no quien además trabaja procesos', () => {
    fijarAlcance({
      alcances: [
        { accion: 'editar', lugar: 'E4' },
        { accion: 'editar', lugar: '3.1' },
      ],
      transversales: [],
    });
    expect(esSoloPresupuesto()).toBe(false);
  });
});
