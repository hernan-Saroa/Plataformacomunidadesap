import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ModalidadDelEstudioPrevio } from './ModalidadDelEstudioPrevio';
import { EstudioPrevio } from '../../types';

const proceso: EstudioPrevio['proceso'] = {
  id: 'p-1',
  radicado: 'CON-2026-0001',
  objeto: 'Adquisición de equipos',
  modalidad: 'MINIMA_CUANTIA',
  modalidadNombre: 'Mínima Cuantía',
  valorEstimado: 20000000,
  etapa: 3,
  radicadoPorMi: true,
};

/**
 * La modalidad dentro de la 3.1 (migración 094): de ella depende la lista de
 * documentos. Como el valor (migración 105), sale del PAA y no se cambia aquí.
 */
describe('ModalidadDelEstudioPrevio', () => {
  it('muestra la modalidad y la cuantía, y que se ratifica con el estudio previo', () => {
    render(<ModalidadDelEstudioPrevio proceso={proceso} />);

    expect(screen.getByText('Mínima Cuantía')).toBeInTheDocument();
    expect(screen.getByText(/Valor estimado/)).toBeInTheDocument();
    expect(screen.getByText(/según el PAA/)).toBeInTheDocument();
    expect(screen.getByText(/ratifica al aprobar el/)).toBeInTheDocument();
  });

  it('ni el área que radicó la puede cambiar: viene del PAA', () => {
    render(<ModalidadDelEstudioPrevio proceso={proceso} />);

    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();
  });
});
