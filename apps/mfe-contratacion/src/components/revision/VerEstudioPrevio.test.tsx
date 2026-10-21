import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { VerEstudioPrevio } from './VerEstudioPrevio';
import { EstudioPrevio } from '../../types';

vi.mock('./LecturaEstudioPrevio', () => ({
  LecturaEstudioPrevio: ({ procesoId }: { procesoId: string }) => <p>Lectura de {procesoId}</p>,
}));

const estudio = {
  proceso: { id: 'p-1', radicado: 'PC-2026-0001', objeto: 'Adquisición de equipos', etapa: 5 },
} as unknown as EstudioPrevio;

/** El estudio previo se consulta encima de donde se esté, sin volver a la 3.1. */
describe('VerEstudioPrevio', () => {
  it('abre la lectura del estudio previo en una ventana y la cierra sin moverse', async () => {
    render(<VerEstudioPrevio estudio={estudio} procesoId="p-1" />);
    expect(screen.queryByText('Lectura de p-1')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Ver estudio previo' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Lectura de p-1')).toBeInTheDocument();
    expect(screen.getByText(/PC-2026-0001 · solo lectura/)).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByText('Lectura de p-1')).toBeNull();
  });
});
