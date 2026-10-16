import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuth } from '../contexts/AuthContext';
import { RundModulePremium } from './RundModulePremium';
vi.mock('./pta/banco-docentes/BancoDocentesPTA', () => ({ BancoDocentesPTA: () => <Probe /> }));
function Probe() {
  const auth = useAuth();
  return <div data-testid="auth">{JSON.stringify({ person: auth.userPersonId, email: auth.userEmail,
    permission: auth.hasPermission('banco-docentes.rund.manage'), connected: Boolean(auth.manualOperatorSession) })}</div>;
}
afterEach(cleanup);
describe('Compatibilidad de la entrada federada RUND', () => {
  it('propaga la conexión opcional sin resolverla automáticamente y conserva permisos', () => {
    const connection = { resolve: vi.fn(), subscribe: vi.fn() };
    render(<RundModulePremium userPersonId="PERSONA" userEmail="operador@example.test"
      userPermissions={['banco-docentes.rund.manage']} manualOperatorSession={connection} />);
    expect(JSON.parse(screen.getByTestId('auth').textContent!)).toEqual({ person: 'PERSONA', email: 'operador@example.test', permission: true, connected: true });
    expect(connection.resolve).not.toHaveBeenCalled(); expect(connection.subscribe).not.toHaveBeenCalled();
  });
  it('mantiene la entrada anterior sin conexión opcional', () => {
    render(<RundModulePremium usuario={{ nombre: 'OPERADOR', email: 'operador@example.test', rol: 'GESTION_PROFESORAL' }} />);
    expect(JSON.parse(screen.getByTestId('auth').textContent!)).toEqual({ email: 'operador@example.test', permission: false, connected: false });
  });
});
