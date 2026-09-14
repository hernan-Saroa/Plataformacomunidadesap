// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { PTADecisionLoading } from './PTADecisionLoading';

afterEach(cleanup);
describe('espera de una decisión PTA', () => {
  it('mantiene el foco en la espera y bloquea Escape hasta que termine la solicitud', () => {
    const { rerender } = render(<><button>Otra decisión</button><PTADecisionLoading /></>);
    const dialog = screen.getByRole('dialog', { name: 'Preparando autenticación' });
    expect(screen.getByRole('status').textContent).toContain('Un momento');
    expect(screen.queryByRole('button', { name: 'Otra decisión' })).toBeNull();
    expect(dialog.contains(document.activeElement)).toBe(true);
    fireEvent.keyDown(document.activeElement!, { key: 'Escape', code: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'Preparando autenticación' })).toBeTruthy();
    rerender(<button>Otra decisión</button>);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Otra decisión' })).toBeTruthy();
  });
  it('distingue la devolución de la preparación de una firma', () => {
    render(<PTADecisionLoading firma={false} />);
    expect(screen.getByRole('dialog', { name: 'Procesando decisión' })).toBeTruthy();
    expect(screen.queryByText(/código de verificación/)).toBeNull();
  });
});
