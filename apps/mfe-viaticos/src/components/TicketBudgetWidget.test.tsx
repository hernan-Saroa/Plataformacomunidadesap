import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TicketBudgetWidget from './TicketBudgetWidget';
import { TicketValidationResult } from '../types/viaticos';

const baseValidacion: TicketValidationResult = {
  is_valid: true,
  requires_route_exception: false,
  requires_budget_exception: false,
  force_land_transport: false,
  saldo_actual_dependencia: 8_000_000,
  holgura_aplicada_porcentaje: 15,
  monto_reserva_con_holgura: 517_500,
  ruta_restringida_encontrada: null,
  message: '',
  nivel_alerta: 'VERDE',
  mensaje_alerta: 'Saldo suficiente para el tiquete estimado.',
};

describe('TicketBudgetWidget', () => {
  it('muestra el semáforo en VERDE cuando hay saldo suficiente', () => {
    render(
      <TicketBudgetWidget
        validacion={baseValidacion}
        montoEstimadoDisplay="$450.000"
      />,
    );
    expect(screen.getByText(/Saldo suficiente ·/)).toBeTruthy();
    expect(screen.getByText(/15%/)).toBeTruthy();
  });

  it('muestra el semáforo en ROJO y la advertencia de bloqueo aéreo', () => {
    render(
      <TicketBudgetWidget
        validacion={{
          ...baseValidacion,
          is_valid: false,
          force_land_transport: true,
          nivel_alerta: 'ROJO',
          saldo_actual_dependencia: 0,
          mensaje_alerta: 'Presupuesto agotado.',
        }}
        montoEstimadoDisplay="$300.000"
      />,
    );
    expect(screen.getByText(/Saldo agotado/i)).toBeTruthy();
    expect(screen.getByText(/Transporte aéreo bloqueado/i)).toBeTruthy();
  });

  it('muestra los badges de excepción cuando la API los reporta', () => {
    render(
      <TicketBudgetWidget
        validacion={{
          ...baseValidacion,
          is_valid: false,
          requires_route_exception: true,
          nivel_alerta: 'VERDE',
          ruta_restringida_encontrada: {
            origen: 'BOGOTA',
            destino: 'VILLAVICENCIO',
            descripcion: 'ruta corta',
          },
        }}
        montoEstimadoDisplay="$350.000"
      />,
    );
    expect(screen.getByText(/Requiere excepción de ruta/i)).toBeTruthy();
  });

  it('no renderiza nada si validacion es null', () => {
    const { container } = render(
      <TicketBudgetWidget validacion={null} montoEstimadoDisplay="$0" />,
    );
    expect(container.firstChild).toBeNull();
  });
});