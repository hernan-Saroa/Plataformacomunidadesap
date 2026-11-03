import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fijarAlcance, olvidarAlcance } from '../auth/alcance';
import { AlcanceVista } from '../types';
import ContratacionModulePremium from './ContratacionModulePremium';

/**
 * Qué entradas del menú ve cada quien (EFDS-1183, migración 083).
 *
 * Esconder no es la protección —el guard del servicio sigue negando— es no
 * pintar puertas falsas. Desde la 083 el menú pregunta por el alcance: qué
 * acción tiene quien mira, y dónde.
 */
vi.mock('./procesos/VistaProcesos', () => ({
  VistaProcesos: () => <div>listado de procesos</div>,
}));
// La entrada de quien trabaja procesos (reestructuración del flujo).
vi.mock('./trabajo/VistaMiTrabajo', () => ({
  VistaMiTrabajo: () => <div>mi trabajo</div>,
}));
vi.mock('./expedientes/VistaExpedientes', () => ({
  VistaExpedientes: () => <div>vista de expedientes</div>,
}));
// El alcance se fija a mano en cada caso: que el módulo no salga a pedirlo.
vi.mock('../services/contratacionService', () => ({
  contratacionService: { alcanceMio: vi.fn(() => new Promise(() => undefined)) },
}));

const CONFIGURAR = 'contratacion.config.manage';

const conAlcance = (lugares: [string, string][], transversales: string[] = []) =>
  fijarAlcance({
    alcances: lugares.map(([accion, lugar]) => ({ accion, lugar }) as AlcanceVista),
    transversales,
  });

const GESTOR: [string, string][] = [
  ['ver', 'TODO'],
  ['editar', '3.1'],
];
const FINANCIERA: [string, string][] = [
  ['ver', 'E8'],
  ['decidir', '8.3'],
  ['aprobar', '9.5'],
];

afterEach(() => {
  olvidarAlcance();
  localStorage.clear();
});

describe('ContratacionModulePremium · menú según el alcance', () => {
  it('ofrece Expedientes a quien ve alguna parte del proceso', () => {
    conAlcance([['ver', 'E3']]);
    render(<ContratacionModulePremium />);

    expect(screen.getByText('Expedientes')).toBeInTheDocument();
  });

  it('no se lo ofrece a quien no ve nada de ningún proceso', () => {
    // El administrador del módulo configura sin trabajar procesos.
    conAlcance([], [CONFIGURAR]);
    render(<ContratacionModulePremium />);

    expect(screen.queryByText('Expedientes')).toBeNull();
  });

  it('esconde la configuración a quien no la administra', () => {
    conAlcance(GESTOR);
    render(<ContratacionModulePremium />);

    for (const tab of ['Umbrales', 'Plazos', 'MIPYME', 'Plantillas']) {
      expect(screen.queryByText(tab)).toBeNull();
    }
  });

  it('se la ofrece a quien sí', () => {
    conAlcance([['ver', 'E3']], [CONFIGURAR]);
    render(<ContratacionModulePremium />);

    expect(screen.getByText('Umbrales')).toBeInTheDocument();
    expect(screen.getByText('Plantillas')).toBeInTheDocument();
  });

  it('mientras el alcance no llega no esconde nada', () => {
    // Otro shell, o la respuesta aún en camino: dejar el menú vacío sería peor
    // que una entrada de más, y el servicio sigue negando lo suyo.
    render(<ContratacionModulePremium />);

    expect(screen.getByText('Expedientes')).toBeInTheDocument();
    expect(screen.getByText('Umbrales')).toBeInTheDocument();
  });

  it('ofrece Alertas a quien trabaja procesos, no solo a quien configura', () => {
    conAlcance(GESTOR);
    render(<ContratacionModulePremium />);

    expect(screen.getByText('Alertas')).toBeInTheDocument();
    expect(screen.queryByText('Umbrales')).toBeNull();
  });

  it('no se la ofrece a quien no ve ningún proceso', () => {
    conAlcance([], [CONFIGURAR]);
    render(<ContratacionModulePremium />);

    expect(screen.queryByText('Alertas')).toBeNull();
  });
});

/**
 * Todos entran por «Mi trabajo».
 *
 * Desde la 103 la Financiera ya no tiene una cola propia: el CDP se tramita por
 * fuera y lo carga el área, así que la bandeja de solicitudes desapareció.
 */
describe('ContratacionModulePremium · por dónde se entra', () => {
  it('la Financiera entra por «Mi trabajo» y ya no tiene la bandeja de CDP', () => {
    conAlcance(FINANCIERA);
    render(<ContratacionModulePremium />);

    expect(screen.getByText('mi trabajo')).toBeInTheDocument();
    expect(screen.queryByText('Solicitudes de CDP')).toBeNull();
  });

  it('sin alcance se entra por «Mi trabajo»', () => {
    render(<ContratacionModulePremium />);

    expect(screen.getByText('mi trabajo')).toBeInTheDocument();
  });

  it('«Mi trabajo» está en el menú de quien ve procesos', () => {
    conAlcance(GESTOR);
    render(<ContratacionModulePremium />);

    expect(screen.getByText('Mi trabajo')).toBeInTheDocument();
    // El listado sigue ahí, para buscar un proceso que no es de uno.
    expect(screen.getByText('Procesos')).toBeInTheDocument();
  });
});
