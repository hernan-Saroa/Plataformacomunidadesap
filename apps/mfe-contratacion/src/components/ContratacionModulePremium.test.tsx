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
