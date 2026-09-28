import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ContadorDiasHabilesBadge } from './ContadorDiasHabilesBadge';

vi.mock('../hooks/useFestivos', () => ({
  useFestivos: () => ({
    festivos: new Set(['2026-07-20', '2026-08-07']),
    cargando: false,
  }),
}));

describe('ContadorDiasHabilesBadge', () => {
  it('renderiza correctamente badge con días hábiles numéricos', () => {
    render(<ContadorDiasHabilesBadge diasHabiles={7} prefijo="Plazo" />);
    expect(screen.getByText('Plazo: 7 días hábiles')).toBeInTheDocument();
  });

  it('renderiza badge en alerta si faltan pocos días o es extemporánea', () => {
    render(<ContadorDiasHabilesBadge diasHabiles={3} extemporanea={true} />);
    expect(screen.getByText('3 días hábiles')).toBeInTheDocument();
  });

  it('renderiza singular correctamente (1 día hábil)', () => {
    render(<ContadorDiasHabilesBadge diasHabiles={1} />);
    expect(screen.getByText('1 día hábil')).toBeInTheDocument();
  });
});
