import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BancoDocenteEditModal } from './BancoDocenteEditModal';
vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn().mockResolvedValue({ personaId: 'test-person', publicada: null, solicitud: null, historial: [] }) } }));
vi.mock('../../../services/api/ptaApi', () => ({ updateBancoDocente: vi.fn(), createBancoDocente: vi.fn(), vincularRundSoporte: vi.fn() }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ isSuperUser: true, userPersonId: 'OPERADOR_FICTICIO' }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const docente = { id: 'docente-ficticio', pregrado: 'Economista', titulos_adicionales: { pregrado: ['Abogado'] } };
const abrirFormacion = async () => {
  render(<BancoDocenteEditModal docente={docente} onClose={vi.fn()} onSaved={vi.fn()}
    suggestion={{ id: 's', campo: 'pregrado', valor: 'Economista', label: 'pregrado', valor_previo: '', pagina: 1, evidencia: 'Doc', estado: 'PENDIENTE', baja_confianza: false }} />);
  await screen.findByDisplayValue('Economista');
};

describe('RUND-003 · edición de varios títulos por nivel', () => {
  it('distingue el título precargado de los adicionales ya registrados', async () => {
    await abrirFormacion();
    expect(screen.getByText('Información precargada')).toBeTruthy();
    expect(screen.getByDisplayValue('Abogado')).toBeTruthy();
    expect(screen.getAllByText('Información adicional')).toHaveLength(1);
  });

  it('permite agregar un segundo título de pregrado sin tocar el primero y quitarlo', async () => {
    await abrirFormacion();
    fireEvent.click(screen.getByRole('button', { name: /Agregar título adicional de pregrado/ }));
    const nuevo = screen.getByLabelText('Título adicional de pregrado 2');
    fireEvent.change(nuevo, { target: { value: 'Politólogo' } });
    expect(screen.getByDisplayValue('Economista')).toBeTruthy();
    expect(screen.getByDisplayValue('Politólogo')).toBeTruthy();
    expect(screen.getAllByText('Información adicional')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Quitar título adicional de pregrado 2' }));
    expect(screen.queryByDisplayValue('Politólogo')).toBeNull();
    expect(screen.getByDisplayValue('Abogado')).toBeTruthy();
  });
});

describe('RUND-003 · tope de títulos adicionales', () => {
  it('oculta el botón de agregar al llegar a 10 adicionales por nivel y lo devuelve al quitar uno', async () => {
    const diez = Array.from({ length: 10 }, (_, i) => `QA-E2E Título ${i + 1}`);
    render(<BancoDocenteEditModal docente={{ id: 'docente-ficticio', pregrado: 'Economista', titulos_adicionales: { pregrado: diez } }} onClose={vi.fn()} onSaved={vi.fn()}
      suggestion={{ id: 's', campo: 'pregrado', valor: 'Economista', label: 'pregrado', valor_previo: '', pagina: 1, evidencia: 'Doc', estado: 'PENDIENTE', baja_confianza: false }} />);
    await screen.findByDisplayValue('Economista');
    expect(screen.queryByRole('button', { name: /Agregar título adicional de pregrado/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Quitar título adicional de pregrado 10' }));
    expect(screen.getByRole('button', { name: /Agregar título adicional de pregrado/ })).toBeTruthy();
  });
});
