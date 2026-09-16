import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ContratacionModulePremium from './ContratacionModulePremium';

/**
 * Qué entradas del menú ve cada rol (EFDS-1183).
 *
 * El primer grupo no filtraba nada: a un usuario con permiso solo para el
 * listado se le ofrecía Expedientes, que reúne todo lo cargado en el proceso.
 * Esconder no es la protección —el guard del servicio sigue negando— es no
 * pintar puertas falsas.
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

describe('ContratacionModulePremium · menú según el permiso', () => {
  const sesionCon = (...permisos: string[]) => {
    (window as unknown as { __esap_auth_cache?: unknown }).__esap_auth_cache = {
      roles: [],
      permissions: permisos,
    };
  };

  afterEach(() => {
    delete (window as unknown as { __esap_auth_cache?: unknown }).__esap_auth_cache;
  });

  it('ofrece Expedientes a quien puede consultarlo', () => {
    sesionCon('contratacion.proceso.view', 'contratacion.expediente.view');
    render(<ContratacionModulePremium />);

    expect(screen.getByText('Expedientes')).toBeInTheDocument();
  });

  it('también al Archivo de Gestión, que audita sin tener `expediente.view`', () => {
    sesionCon('contratacion.expediente.auditar');
    render(<ContratacionModulePremium />);

    expect(screen.getByText('Expedientes')).toBeInTheDocument();
  });

  it('no se lo ofrece a quien solo ve el listado', () => {
    sesionCon('contratacion.proceso.view');
    render(<ContratacionModulePremium />);

    // Entra al módulo —el listado se pinta— pero sin la entrada al expediente.
    expect(screen.getByText('listado de procesos')).toBeInTheDocument();
    expect(screen.queryByText('Expedientes')).toBeNull();
  });

  it('esconde la sección de configuración a quien no la administra', () => {
    sesionCon('contratacion.proceso.view');
    render(<ContratacionModulePremium />);

    for (const tab of ['Umbrales', 'Plazos', 'MIPYME', 'Plantillas']) {
      expect(screen.queryByText(tab)).toBeNull();
    }
  });

  it('se la ofrece a quien sí', () => {
    sesionCon('contratacion.proceso.view', 'contratacion.config.manage');
    render(<ContratacionModulePremium />);

    expect(screen.getByText('Umbrales')).toBeInTheDocument();
    expect(screen.getByText('Plantillas')).toBeInTheDocument();
  });

  it('sin sesión no esconde nada', () => {
    // Otro shell, o la sesión aún sin restaurar: dejar el menú vacío sería
    // peor que una entrada de más, y el servicio sigue negando lo suyo.
    render(<ContratacionModulePremium />);

    expect(screen.getByText('Expedientes')).toBeInTheDocument();
    expect(screen.getByText('Umbrales')).toBeInTheDocument();
  });

  it('ofrece Alertas a quien trabaja procesos, no solo a quien configura', () => {
    // Estaba dentro de Configuracion, que exige el permiso de administrar: el
    // gestor tenia «ver alertas» y aun asi no veia la entrada donde le llegan
    // sus aprobaciones pendientes.
    sesionCon('contratacion.proceso.view', 'contratacion.alerta.ver');
    render(<ContratacionModulePremium />);

    expect(screen.getByText('Alertas')).toBeInTheDocument();
    expect(screen.queryByText('Umbrales')).toBeNull();
  });

  it('no se la ofrece a quien no tiene ese permiso', () => {
    sesionCon('contratacion.proceso.view');
    render(<ContratacionModulePremium />);

    expect(screen.queryByText('Alertas')).toBeNull();
  });
});

/**
 * La Dirección Financiera entra por su cola, no por la lista de procesos.
 *
 * Su trabajo en el módulo no es un expediente sino las solicitudes de CDP que
 * esperan, y hasta que existió la bandeja abría el módulo, veía la misma lista
 * que todos y no tenía forma de saber qué le tocaba.
 */
describe('ContratacionModulePremium · la bandeja de la Financiera', () => {
  const sesionCon = (...permisos: string[]) => {
    (window as unknown as { __esap_auth_cache?: unknown }).__esap_auth_cache = {
      roles: [],
      permissions: permisos,
    };
  };

  afterEach(() => {
    delete (window as unknown as { __esap_auth_cache?: unknown }).__esap_auth_cache;
  });

  it('quien gestiona presupuesto entra directo a la bandeja', () => {
    sesionCon('contratacion.proceso.view', 'contratacion.presupuesto.gestionar');
    render(<ContratacionModulePremium />);

    expect(screen.getByText('bandeja de solicitudes de CDP')).toBeInTheDocument();
    expect(screen.queryByText('listado de procesos')).toBeNull();
  });

  it('y la tiene en el menú', () => {
    sesionCon('contratacion.proceso.view', 'contratacion.presupuesto.gestionar');
    render(<ContratacionModulePremium />);

    expect(screen.getByText('Solicitudes de CDP')).toBeInTheDocument();
  });

  it('quien además diligencia procesos sigue entrando por la lista', () => {
    // Un mismo usuario puede tener los dos papeles. Entonces la lista sí es su
    // trabajo, y mandarlo a la bandeja le escondería la mitad de lo que hace.
    sesionCon(
      'contratacion.proceso.view',
      'contratacion.actividad.edit',
      'contratacion.presupuesto.gestionar',
    );
    render(<ContratacionModulePremium />);

    expect(screen.getByText('listado de procesos')).toBeInTheDocument();
    expect(screen.getByText('Solicitudes de CDP')).toBeInTheDocument();
  });

  it('a quien no mueve presupuesto no se le ofrece', () => {
    sesionCon('contratacion.proceso.view', 'contratacion.actividad.edit');
    render(<ContratacionModulePremium />);

    expect(screen.queryByText('Solicitudes de CDP')).toBeNull();
    expect(screen.getByText('listado de procesos')).toBeInTheDocument();
  });

  it('sin sesión se entra por la lista, como siempre', () => {
    // `tienePermiso` responde que sí ante una sesión incompleta, así que sin
    // este cuidado cualquiera sin sesión aterrizaría en la bandeja.
    render(<ContratacionModulePremium />);

    expect(screen.getByText('listado de procesos')).toBeInTheDocument();
  });
});
