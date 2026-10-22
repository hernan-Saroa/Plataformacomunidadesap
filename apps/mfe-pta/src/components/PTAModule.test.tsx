// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { PTAModule } from './PTAModule';

vi.mock('./pta/PtaBackofficeModule', () => ({
  PtaBackofficeModule: () => <div>Gestión PTA</div>,
}));
vi.mock('./esap/NotificationsContext', () => ({
  NotificationsProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('../contexts/AuthContext', () => ({
  AuthProvider: ({ children, isSuperUser }: { children: React.ReactNode; isSuperUser: boolean }) =>
    <div data-testid="pta-auth" data-super-user={String(isSuperUser)}>{children}</div>,
}));
vi.mock('@esap-mfe/shared-ui/sonner', () => ({
  Toaster: ({ position, offset, mobileOffset, className }: {
    position: string; offset: number; mobileOffset: number; className: string;
  }) => <div data-testid="pta-toaster" data-position={position} data-offset={offset}
    data-mobile-offset={mobileOffset} className={className} />,
}));

afterEach(cleanup);

describe('avisos de PTA integrado', () => {
  it.each([
    { roles: ['SUPER_ADMIN'], superUser: true },
    { roles: ['PERSONALIZADO', 'super_admin'], superUser: true },
    { roles: [{ code: 'SUPER_ADMIN' }], superUser: true },
    { roles: ['ADMIN_RUND'], superUser: false },
    { roles: ['RUND_CARGADOR'], superUser: false },
    { roles: [], superUser: false },
  ])('solo el rol de sistema concede acceso total: $roles', ({ roles, superUser }) => {
    render(<PTAModule userRoles={roles as any} userEmail="desarrollo.ccd@esap.edu.co" embedded initialView="banco_docentes" />);
    expect(screen.getByTestId('pta-auth').getAttribute('data-super-user')).toBe(String(superUser));
  });

  it('ancla el contenedor a la ventana y no al área del módulo', () => {
    render(<div style={{ transform: 'translateX(200px)' }}><PTAModule embedded /></div>);

    const toaster = screen.getByTestId('pta-toaster');
    expect(toaster.parentElement).toBe(document.body);
    expect(toaster.getAttribute('data-position')).toBe('bottom-right');
    expect(toaster.getAttribute('data-offset')).toBe('20');
    expect(toaster.getAttribute('data-mobile-offset')).toBe('16');
    expect(toaster.classList.contains('pta-toaster')).toBe(true);
  });
});
