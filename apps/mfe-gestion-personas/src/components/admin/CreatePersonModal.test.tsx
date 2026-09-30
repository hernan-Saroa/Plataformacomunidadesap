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
  dependenciasService: { listar: vi.fn().mockResolvedValue([{ idDependencia: 1, codDependencia: 'DEP', nomDependencia: 'Planeación' }]) },
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
    const territorial = screen.getByText('Territorial (Seccional)').parentElement!.querySelector('select')!;
    const cetap = screen.getByText('CETAP (Sede)').parentElement!.querySelector('select')!;
    await waitFor(() => expect(territorial.querySelectorAll('option')).toHaveLength(3));
    expect((cetap as HTMLSelectElement).value).toBe('100');

    fireEvent.change(territorial, { target: { value: '15' } });
    expect((cetap as HTMLSelectElement).value).toBe('');
    expect([...cetap.querySelectorAll('option')].map(option => option.textContent)).toEqual([
      'Seleccionar CETAP/Sede...', 'Ibagué',
    ]);
    fireEvent.change(cetap, { target: { value: '150' } });
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
    const territorial = screen.getByText('Territorial (Seccional)').parentElement!.querySelector('select')!;
    const cetap = screen.getByText('CETAP (Sede)').parentElement!.querySelector('select')!;
    await waitFor(() => expect(territorial.querySelectorAll('option')).toHaveLength(3));
    fireEvent.change(territorial, { target: { value: '' } });
    expect((cetap as HTMLSelectElement).value).toBe('');
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
    const territorial = screen.getByText('Territorial (Seccional)').parentElement!.querySelector('select')!;
    await waitFor(() => expect(territorial.querySelectorAll('option')).toHaveLength(3));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Guardar Cambios' })).toBeTruthy();
  });
});
