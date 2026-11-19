import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { FranjaSituacion } from './FranjaSituacion';
import { Situacion } from './situacionDelProceso';

const situacion: Situacion = {
  momento: 'redaccion',
  numeral: '3.1',
  titulo: 'Corregir: Elaboración de estudios previos',
  etapa: 3,
  quien: 'Área solicitante',
  teToca: true,
  espera: 'La devolvieron con observaciones: hay que corregirla y enviarla otra vez',
  ultimoMovimiento: null,
};

describe('FranjaSituacion', () => {
  // BUG-003 de QA (17/11): las observaciones solo se veían en el historial.
  it('muestra lo que pidieron corregir en la devolución', () => {
    render(
      <FranjaSituacion
        situacion={situacion}
        devolucion={{
          observaciones: 'Falta el análisis del sector',
          por: 'Secretario de Contratación',
          fecha: '2026-11-17T15:00:00Z',
        }}
      />,
    );
    expect(screen.getByText('Falta el análisis del sector')).toBeInTheDocument();
    expect(screen.getByText(/Secretario de Contratación/)).toBeInTheDocument();
  });

  it('sin devolución no inventa observaciones', () => {
    render(<FranjaSituacion situacion={{ ...situacion, espera: null }} />);
    expect(screen.queryByText(/Secretario/)).toBeNull();
  });
});
