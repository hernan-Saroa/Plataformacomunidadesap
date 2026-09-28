import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { toast } from 'sonner';
import { CertificadosLaboralesRouter } from './CertificadosLaboralesRouter';

// El router solo decide permisos y navegación: las vistas se sustituyen por
// marcadores para no arrastrar sus peticiones ni su render completo.
vi.mock('./CertificadosLaboralesDashboard', () => ({
  CertificadosLaboralesDashboard: (props: any) => (
    <div>
      <span data-testid="can-view">{String(props.canViewFunctions)}</span>
      <span data-testid="can-manage">{String(props.canManageFunctions)}</span>
      <button onClick={() => props.onNavigate?.('funciones-laborales')}>Ir a funciones</button>
    </div>
  ),
}));
vi.mock('./LaborFunctionsManager', () => ({
  LaborFunctionsManager: (props: any) => (
    <div data-testid="funciones-laborales">manage:{String(props.canManage)}</div>
  ),
}));
vi.mock('./ValidarCertificadoQR', () => ({ ValidarCertificadoQR: () => null }));
vi.mock('./AnalyticsDashboard', () => ({ AnalyticsDashboard: () => null }));
vi.mock('./HistoricoValidaciones', () => ({ HistoricoValidaciones: () => null }));
vi.mock('./GeneradorReportes', () => ({ GeneradorReportes: () => null }));
vi.mock('./NotificacionesValidacion', () => ({ NotificacionesValidacion: () => null }));
vi.mock('./APIDocumentacion', () => ({ APIDocumentacion: () => null }));
vi.mock('./ConfiguracionPlantilla', () => ({ ConfiguracionPlantilla: () => null }));
vi.mock('./CertificateCorrectionRequests', () => ({ CertificateCorrectionRequests: () => null }));
vi.mock('@esap-mfe/shared-ui/sonner', () => ({ Toaster: () => null }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), info: vi.fn(), success: vi.fn() } }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const VIEW = 'certificados-laborales.functions.view';
const MANAGE = 'certificados-laborales.functions.manage';

const abrirFunciones = (permisos: string[]) => {
  render(<CertificadosLaboralesRouter userPermissions={permisos} />);
  fireEvent.click(screen.getByRole('button', { name: 'Ir a funciones' }));
};

describe('Acceso al módulo Funciones laborales', () => {
  it('sin ningún permiso no deja entrar y avisa', () => {
    abrirFunciones([]);

    expect(screen.queryByTestId('funciones-laborales')).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(
      'No tienes permiso para consultar las funciones laborales.',
    );
  });

  it('con el permiso de lectura entra en modo consulta', () => {
    abrirFunciones([VIEW]);

    expect(screen.getByTestId('funciones-laborales').textContent).toBe('manage:false');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('con el permiso de gestión entra con la escritura habilitada', () => {
    abrirFunciones([MANAGE]);

    expect(screen.getByTestId('funciones-laborales').textContent).toBe('manage:true');
  });

  it('gestionar implica ver: no hay que marcar los dos permisos', () => {
    render(<CertificadosLaboralesRouter userPermissions={[MANAGE]} />);

    expect(screen.getByTestId('can-view').textContent).toBe('true');
    expect(screen.getByTestId('can-manage').textContent).toBe('true');
  });

  it('el permiso de lectura no habilita la escritura', () => {
    render(<CertificadosLaboralesRouter userPermissions={[VIEW]} />);

    expect(screen.getByTestId('can-view').textContent).toBe('true');
    expect(screen.getByTestId('can-manage').textContent).toBe('false');
  });

  it('acepta también el prefijo corto cl.', () => {
    render(<CertificadosLaboralesRouter userPermissions={['cl.functions.view']} />);

    expect(screen.getByTestId('can-view').textContent).toBe('true');
  });

  it('sin permisos el dashboard no recibe acceso al módulo', () => {
    render(<CertificadosLaboralesRouter userPermissions={['certificados-laborales.export.report']} />);

    expect(screen.getByTestId('can-view').textContent).toBe('false');
    expect(screen.getByTestId('can-manage').textContent).toBe('false');
  });
});
