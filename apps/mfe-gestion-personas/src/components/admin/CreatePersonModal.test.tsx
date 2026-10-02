// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CreatePersonModal } from './CreatePersonModal';
import { estructuraService } from '../../services/estructuraService';

vi.mock('../../hooks/useRoles', () => ({
  useRoles: () => ({ roles: [{ id: 'rol-1', nombre: 'Administrativo General' }] }),
}));
vi.mock('../../services/estructuraService', () => ({
  estructuraService: { obtenerEstructura: vi.fn() },
}));
vi.mock('../../services/api/dependencias.service', () => ({
  dependenciasService: {
    listar: vi.fn().mockResolvedValue([{ idDependencia: 1, codDependencia: 'DEP', nomDependencia: 'Planeación' }]),
    obtenerCargosPorDependencia: vi.fn().mockResolvedValue([]),
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const initialData = {
  firstName: 'Alvaro', lastName: 'Varon', documentType: 'CC', documentNumber: '14224261',
  email: 'alvaro@esap.edu.co', phone: '3001234567', birthDate: '1980-01-01',
  role: 'Administrativo General', idDependencia: 1, idSeccional: 10, idSede: 100,
};

describe('asignación territorial del usuario', () => {
  const catalogo = {
    data: {
      seccionales: [{ idSeccional: 10, nomSeccional: 'Meta' }, { idSeccional: 15, nomSeccional: 'Tolima' }],
      sedes: [
        { idSede: 100, idSeccional: 10, nomSede: 'Granada' },
        { idSede: 150, idSeccional: 15, nomSede: 'Ibagué' },
      ],
    },
  };

  it('usa el catálogo vigente y solo ofrece los CETAP de la territorial seleccionada', async () => {
    vi.mocked(estructuraService.obtenerEstructura).mockResolvedValue(catalogo as any);
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<CreatePersonModal isOpen editMode initialData={initialData} onClose={vi.fn()} onCreate={onCreate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    const territorial = screen.getByText('Territorial (Seccional)').parentElement!.querySelector('button')!;
    const cetap = screen.getByText('CETAP (Sede)').parentElement!.querySelector('button')!;
    await waitFor(() => expect(territorial.textContent).toContain('Meta'));
    expect(cetap.textContent).toContain('Granada');

    fireEvent.click(territorial);
    expect(screen.getByRole('button', { name: 'Tolima' })).toBeTruthy();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Tolima' }));
    expect(cetap.textContent).toContain('Buscar CETAP/Sede...');
    fireEvent.click(cetap);
    expect(screen.getByRole('button', { name: 'Ibagué' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Granada' })).toBeNull();
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Ibagué' }));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      idSeccional: 15, idSede: 150,
    })));
  });

  it('permite dejar la cuenta sin territorial y limpia su CETAP anterior', async () => {
    vi.mocked(estructuraService.obtenerEstructura).mockResolvedValue(catalogo as any);
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<CreatePersonModal isOpen editMode initialData={initialData} onClose={vi.fn()} onCreate={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    const territorialContainer = screen.getByText('Territorial (Seccional)').parentElement!;
    const territorial = territorialContainer.querySelector('button')!;
    const cetap = screen.getByText('CETAP (Sede)').parentElement!.querySelector('button')!;
    await waitFor(() => expect(territorial.textContent).toContain('Meta'));
    fireEvent.click(territorialContainer.querySelector('[role="button"]')!);
    expect(cetap.textContent).toContain('Primero seleccione territorial...');
    expect(cetap.hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      idSeccional: undefined, idSede: undefined,
      sedePrincipalId: undefined, asignacionesSedes: [],
    })));
  });

  it('mantiene abierto el formulario cuando el servidor rechaza la edición', async () => {
    vi.mocked(estructuraService.obtenerEstructura).mockResolvedValue(catalogo as any);
    const onCreate = vi.fn().mockRejectedValue(new Error('CETAP inválido'));
    const onClose = vi.fn();
    render(<CreatePersonModal isOpen editMode initialData={initialData} onClose={onClose} onCreate={onCreate} />);
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    const territorial = screen.getByText('Territorial (Seccional)').parentElement!.querySelector('button')!;
    await waitFor(() => expect(territorial.textContent).toContain('Meta'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Guardar Cambios' })).toBeTruthy();
  });
});
