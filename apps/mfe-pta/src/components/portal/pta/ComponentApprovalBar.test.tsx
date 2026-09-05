import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { ComponentApprovalBar } from './PortalDocentePTA';

vi.mock('../../../../../shell/src/services/api', () => ({ getBaseURL: () => 'http://localhost' }));
vi.mock('../../../services/api/ptaApi', () => ({}));
vi.mock('./PTAForm', () => ({ PTAForm: () => null }));
vi.mock('./VistasV11V15PTA', () => ({}));
vi.mock('../../esap/NotificationsContext', () => ({}));
vi.mock('../../../hooks/usePTARealtimeSync', () => ({}));

afterEach(cleanup);

describe('tarjetas superiores del portal docente', () => {
  const pta = { estado: 'Aprobado', horas_docencia: 384, horas_investigacion: 200, horas_extension: 0, horas_complementarias: 170 };

  it('renderiza Extensión en gris y No aplica, sin heredar el aprobado global', () => {
    render(<ComponentApprovalBar estado={pta.estado} pta={pta} />);
    const extension = screen.getByText('Extensión').parentElement!;
    expect(within(extension).getByText('No aplica')).toBeTruthy();
    expect(within(extension).queryByText('Aprobado')).toBeNull();
    expect(extension.style.background).toBe('rgb(248, 250, 252)');
    expect(screen.getAllByText('Aprobado')).toHaveLength(3);
  });

  it('mantiene coherencia entre la tarjeta y sus cuatro subsecciones vacías', () => {
    const rows = ['ext_capacitacion', 'ext_procesos', 'ext_fortalecimiento', 'ext_gobierno'].map(componente => ({
      componente, estado: 'aprobado', aprobadorNombre: 'Sistema', aplica: false, horas: 0, estado_visual: 'no_aplica',
    }));
    render(<ComponentApprovalBar estado={pta.estado} pta={pta} componentesAprobacion={rows} />);
    expect(screen.getAllByText('No aplica')).toHaveLength(5);
    expect(screen.getAllByText('Aprobado')).toHaveLength(3);
  });
});
