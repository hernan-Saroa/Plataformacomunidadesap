import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { RevisionPropuesta } from './RevisionPropuesta';
import { getPTAById } from '../../../services/api/ptaApi';

vi.mock('../../../services/api/ptaApi', () => ({
  getPTAById: vi.fn(), getCatalogoActividadesComplementarias: vi.fn().mockResolvedValue({ success: true, data: [] }),
  responderPropuestaPTA: vi.fn(),
}));
vi.mock('../../esap/NotificationsContext', () => ({ useNotifications: () => ({ addNotification: vi.fn() }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Investigación en la propuesta del docente', () => {
  it.each([false, true])('muestra las actividades independientemente de que tenga proyecto: %s', async conProyecto => {
    vi.mocked(getPTAById).mockResolvedValue({ success: true, data: {
      id: 'pta-1', estado: 'NOTIFICADO_DOCENTE',
      investigacion_proyecto: conProyecto ? { nombre: 'Proyecto conjunto', horas_solicitadas: 200 } : {},
      investigacion_actividades: [{ actividad_nombre: 'Actividad asignada', horas: 32 }],
    } } as any);
    render(<RevisionPropuesta ptaId="pta-1" userPersonId="docente-1" onBack={() => {}} />);
    expect(await screen.findByText('Actividad asignada')).toBeTruthy();
    expect(screen.getByText('32h')).toBeTruthy();
    expect(screen.getByPlaceholderText('Opcional...')).toBeTruthy();
    expect(Boolean(screen.queryByText('Proyecto conjunto'))).toBe(conProyecto);
  });
});
