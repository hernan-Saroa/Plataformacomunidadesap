import React from 'react';
import { act, render, screen } from '@testing-library/react';
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
vi.mock('./expedientes/VistaExpedientes', () => ({
  VistaExpedientes: () => <div>vista de expedientes</div>,
}));
vi.mock('./cdp/VistaBandejaCdp', () => ({
  VistaBandejaCdp: () => <div>bandeja de solicitudes de CDP</div>,
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
  ['editar', '4.1'],
];
const FINANCIERA: [string, string][] = [
  ['ver', 'E4'],
  ['editar', '4.2'],
  ['editar', '4.3'],
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
 * La Dirección Financiera entra por su cola, no por la lista de procesos.
 *
 * Su trabajo en el módulo no es un expediente sino las solicitudes de CDP que
 * esperan.
 */
describe('ContratacionModulePremium · la bandeja de la Financiera', () => {
  it('quien solo mueve presupuesto entra directo a la bandeja', () => {
    conAlcance(FINANCIERA);
    render(<ContratacionModulePremium />);

    expect(screen.getByText('bandeja de solicitudes de CDP')).toBeInTheDocument();
    expect(screen.queryByText('listado de procesos')).toBeNull();
  });

  it('también si su alcance llega después de abrir el módulo', () => {
    // El alcance viene del servicio: al montar todavía no se sabe quién entra.
    render(<ContratacionModulePremium />);
    expect(screen.getByText('listado de procesos')).toBeInTheDocument();

    act(() => conAlcance(FINANCIERA));

    expect(screen.getByText('bandeja de solicitudes de CDP')).toBeInTheDocument();
  });

  it('y la tiene en el menú', () => {
    conAlcance(FINANCIERA);
    render(<ContratacionModulePremium />);

    expect(screen.getByText('Solicitudes de CDP')).toBeInTheDocument();
  });

  it('quien además diligencia procesos sigue entrando por la lista', () => {
    // Un mismo usuario puede tener los dos papeles. Entonces la lista sí es su
    // trabajo, y mandarlo a la bandeja le escondería la mitad de lo que hace.
    conAlcance([...FINANCIERA, ['editar', '3.1']]);
    render(<ContratacionModulePremium />);

    expect(screen.getByText('listado de procesos')).toBeInTheDocument();
    expect(screen.getByText('Solicitudes de CDP')).toBeInTheDocument();
  });

  it('a quien no mueve presupuesto no se le ofrece', () => {
    conAlcance(GESTOR);
    render(<ContratacionModulePremium />);

    expect(screen.queryByText('Solicitudes de CDP')).toBeNull();
    expect(screen.getByText('listado de procesos')).toBeInTheDocument();
  });

  it('sin alcance se entra por la lista, como siempre', () => {
    // Ante la duda todo responde que sí, así que sin este cuidado cualquiera
    // aterrizaría en la bandeja.
    render(<ContratacionModulePremium />);

    expect(screen.getByText('listado de procesos')).toBeInTheDocument();
  });
});
