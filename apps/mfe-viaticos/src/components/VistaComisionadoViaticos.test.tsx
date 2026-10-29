import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VistaComisionadoViaticos from './VistaComisionadoViaticos';

vi.mock('./ComisionadoInbox', () => ({
  default: () => <div data-testid="mock-comisionado-inbox">Bandeja Comisionado Activa</div>,
}));

vi.mock('./LegalizacionComisionado', () => ({
  default: () => <div data-testid="mock-legalizacion-comisionado">Legalización Comisionado Activa</div>,
}));

describe('VistaComisionadoViaticos', () => {
  it('debe renderizar por defecto la pestaña de Mis Comisiones', () => {
    render(<VistaComisionadoViaticos />);

    expect(screen.getByText(/Mis Comisiones de Servicios/i)).toBeInTheDocument();
    expect(screen.getByText(/Legalización de Gastos/i)).toBeInTheDocument();
    expect(screen.getByTestId('mock-comisionado-inbox')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-legalizacion-comisionado')).not.toBeInTheDocument();
  });

  it('debe permitir cambiar a la pestaña de Legalización de Gastos', () => {
    render(<VistaComisionadoViaticos />);

    const tabLegalizaciones = screen.getByRole('tab', { name: /Legalización de Gastos/i });
    fireEvent.click(tabLegalizaciones);

    expect(screen.getByTestId('mock-legalizacion-comisionado')).toBeInTheDocument();
    expect(screen.queryByTestId('mock-comisionado-inbox')).not.toBeInTheDocument();
  });
});
