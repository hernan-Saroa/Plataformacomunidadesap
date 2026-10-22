import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BancoDocenteAprobacion } from './BancoDocenteAprobacion';
import { getRundBloques } from '../../../services/api/ptaApi';

vi.mock('../../../services/api/ptaApi', () => ({
  getRundBloques: vi.fn(), aprobarRundBloque: vi.fn(), devolverRundBloque: vi.fn(), vincularRundSoporte: vi.fn(),
}));
afterEach(cleanup);

describe('Autores y revisores de las aprobaciones RUND', () => {
  it.each([true, false])('muestra nombres o una alternativa legible con nombres disponibles: %s', async available => {
    const author = '770e8400-e29b-41d4-a716-446655440001';
    const reviewer = '770e8400-e29b-41d4-a716-446655440002';
    vi.mocked(getRundBloques).mockResolvedValue({ success: true, data: [{
      id: 'bloque', bloque: 'IDENTIDAD', estado: 'Aprobado', version: 1, soportes: [],
      cargado_por: author, revisado_por: reviewer,
      ...(available ? { cargadoPorNombre: 'Gestor Documental', revisadoPorNombre: 'Revisora Académica' } : {}),
    }] } as any);
    render(<BancoDocenteAprobacion docenteId="docente" docenteNombre="Docente de Prueba" />);
    fireEvent.click((await screen.findAllByText('Identidad'))[0]);
    if (available) {
      expect(await screen.findByText(/Gestor Documental/)).toBeTruthy();
      expect(screen.getByText(/Revisora Académica/)).toBeTruthy();
    } else expect(await screen.findAllByText(/Usuario no disponible/)).toHaveLength(2);
    expect(document.body.textContent).not.toContain(author);
    expect(document.body.textContent).not.toContain(reviewer);
  });
});
