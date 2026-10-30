import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

function AccessProbe() {
  const auth = useAuth();
  return <div>
    {auth.hasPermission('banco-docentes.rund.create') && <button>Registrar docente</button>}
    {auth.hasPermission('banco-docentes.rund.validate') && <button>Aprobar bloque</button>}
    {auth.hasAnyPermission(['banco-docentes.rund.documents.manage']) && <button>Cargar documento</button>}
    {auth.hasPermission('banco-docentes.rund.incorporacion') && <button>Registrar contrato</button>}
  </div>;
}

afterEach(cleanup);

describe('Permisos RUND al cambiar la sesión', () => {
  it('no conserva privilegios del Super Admin al pasar a una sesión de revisor', () => {
    const view = render(<AuthProvider userPersonId="admin" isSuperUser><AccessProbe /></AuthProvider>);
    expect(screen.getAllByRole('button')).toHaveLength(4);
    view.rerender(<AuthProvider userPersonId="revisor" permisos={['banco-docentes.rund.revision']}><AccessProbe /></AuthProvider>);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Aprobar bloque' })).toBeTruthy();
  });

  it('retira carga e incorporación cuando cambian los permisos de la misma persona y limpia todos al retirarlos', () => {
    const view = render(<AuthProvider userPersonId="persona" permisos={['banco-docentes.rund.carga', 'banco-docentes.rund.revision', 'banco-docentes.rund.incorporacion']}><AccessProbe /></AuthProvider>);
    expect(screen.getAllByRole('button')).toHaveLength(4);
    view.rerender(<AuthProvider userPersonId="persona" permisos={['banco-docentes.rund.revision']}><AccessProbe /></AuthProvider>);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Cargar documento' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Registrar contrato' })).toBeNull();
    view.rerender(<AuthProvider userPersonId="persona" permisos={[]}><AccessProbe /></AuthProvider>);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });
});
