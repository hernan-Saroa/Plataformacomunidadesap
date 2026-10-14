import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BackofficeApp } from './BackofficeApp';

vi.mock('../rund/RundEntries', () => ({ RundShellModule: (props: any) => <pre data-testid="rund-bank">{JSON.stringify(props)}</pre> }));
vi.mock('pta/Module', () => ({ PTAModule: (props: any) => <pre data-testid="pta-module">{JSON.stringify(props)}</pre> }));
vi.mock('./SidebarPremium', () => ({ SidebarPremium: (props: any) => <div>
  <span data-testid="current-menu">{props.currentModule}</span>
  {['banco-docentes-pta', 'rund', 'pta'].map(module => <button key={module} onClick={() => props.onModuleChange(module)}>{module}</button>)}
</div> }));
vi.mock('./TopBar', () => ({ TopBar: () => null }));
vi.mock('./ProfileModal', () => ({ ProfileModal: () => null }));
vi.mock('../portal/PortalDashboard', () => ({ PortalDashboard: () => <p>Portal académico</p> }));
vi.mock('./NotificationsContext', () => ({ NotificationsProvider: ({ children }: any) => children }));
vi.mock('./gestion-legal/design-system/TourContext', () => ({ TourProvider: ({ children }: any) => children }));
vi.mock('./ChatbotFloatingButton', () => ({ ChatbotFloatingButton: () => null }));
vi.mock('../../services/api/modules.service', () => ({ modulesService: { getActiveModules: vi.fn().mockResolvedValue([]) } }));

beforeEach(() => {
  window.history.replaceState({}, '', '/');
  Object.defineProperty(window, 'matchMedia', { configurable: true, value: vi.fn(() => ({ addEventListener: vi.fn(), removeEventListener: vi.fn() })) });
});
afterEach(cleanup);
const user = { name: 'GGP', email: 'ggp@example.test', personId: 'persona-ggp', roles: ['GESTION_PROFESORAL'],
  permissions: ['banco-docentes.rund.manage'], modules: ['banco-docentes-pta', 'rund', 'pta'] };

describe('Menú histórico y entrada nueva del banco RUND', () => {
  it.each(['banco-docentes-pta', 'banco-docentes', 'rund'])('abre RUND desde module=%s con la sesión existente', async module => {
    window.history.replaceState({}, '', '/?module=' + module);
    render(<BackofficeApp userData={user} />);
    const props = JSON.parse((await screen.findByTestId('rund-bank')).textContent!);
    expect(props.userPersonId).toBe(user.personId);
    expect(props.userRoles).toEqual(user.roles);
    expect(props.userPermissions).toEqual(user.permissions);
    expect(screen.queryByTestId('pta-module')).toBeNull();
    expect(screen.getByTestId('current-menu')).toHaveTextContent(module === 'banco-docentes' ? 'banco-docentes-pta' : module);
  });

  it('mantiene PTA para planes y permite volver al banco mediante el menú anterior', async () => {
    render(<BackofficeApp userData={user} />);
    expect(await screen.findByTestId('rund-bank')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'pta' }));
    expect(await screen.findByTestId('pta-module')).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId('pta-module').textContent!).initialView).toBeUndefined();
    fireEvent.click(screen.getByRole('button', { name: 'banco-docentes-pta' }));
    expect(await screen.findByTestId('rund-bank')).toBeInTheDocument();
    expect(screen.queryByTestId('pta-module')).toBeNull();
  });
});
