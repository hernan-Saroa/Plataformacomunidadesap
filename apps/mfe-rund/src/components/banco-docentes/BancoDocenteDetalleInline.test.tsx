import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { BancoDocenteDetalleInline } from './BancoDocenteDetalleInline';
import { getBancoDocenteCabezote } from '../../../services/api/ptaApi';

vi.mock('../../../services/api/ptaApi', () => ({ getBancoDocenteCabezote: vi.fn() }));
vi.mock('./RundValidationPanel', () => ({ RundValidationPanel: () => <div>Validación existente</div> }));
afterEach(cleanup);
beforeEach(() => vi.clearAllMocks());

const fila = { id: 'docente-1', nombre_completo: 'NOMBRE DEL LISTADO', periodoCarga: '2026-2' };
const perfil = {
  nombre_completo: 'NOMBRE CONFIRMADO', tipo_vinculacion: 'Ocasional', categoria: 'Asociado',
  territorial: 'Antioquia', puntaje_salarial: 150, ultima_evaluacion: 'Excelente',
  periodo_carga: '2026-2', proteccion_datos: { acceso_completo: true },
};
const vista = (docente = fila, periodoCarga = '2026-2') => (
  <table><tbody><BancoDocenteDetalleInline docente={docente} periodoCarga={periodoCarga} /></tbody></table>
);

describe('Integración del cabezote en el detalle RUND', () => {
  it('consulta el periodo seleccionado y muestra los datos del servidor', async () => {
    vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: true, data: perfil });
    render(vista());
    expect(screen.getByRole('status')).toBeTruthy();
    await screen.findByRole('heading', { name: 'NOMBRE CONFIRMADO' });
    expect(getBancoDocenteCabezote).toHaveBeenCalledWith('docente-1', '2026-2');
    expect(screen.getByText('Asociado')).toBeTruthy();
    expect(screen.queryByText('NOMBRE DEL LISTADO')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.queryByTitle('Cerrar detalle')).toBeNull();
    expect(screen.getByText('Validación existente')).toBeTruthy();
  });

  it('descarta respuestas de otro periodo que terminan después de la consulta actual', async () => {
    let resolverAnterior!: (value: any) => void;
    vi.mocked(getBancoDocenteCabezote)
      .mockImplementationOnce(() => new Promise((resolve) => { resolverAnterior = resolve; }))
      .mockResolvedValueOnce({ success: true, data: perfil });
    const { rerender } = render(vista(fila, '2025-2'));
    rerender(vista(fila));
    await screen.findByRole('heading', { name: 'NOMBRE CONFIRMADO' });
    await act(async () => resolverAnterior({ success: true, data: { ...perfil, nombre_completo: 'PERFIL ANTERIOR' } }));
    expect(screen.queryByText('PERFIL ANTERIOR')).toBeNull();
    expect(screen.getByRole('heading', { name: 'NOMBRE CONFIRMADO' })).toBeTruthy();
  });

  it('muestra el fallo de consulta sin confundirlo con campos no registrados', async () => {
    vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: false, data: null });
    render(vista());
    await screen.findByRole('alert');
    expect(screen.queryByText('No registrado')).toBeNull();
    expect(screen.getByText('Validación existente')).toBeTruthy();
  });

  it('vuelve a consultar cuando el listado se actualiza tras editar', async () => {
    vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: true, data: perfil });
    const { rerender } = render(vista());
    await screen.findByRole('heading', { name: 'NOMBRE CONFIRMADO' });
    vi.mocked(getBancoDocenteCabezote).mockResolvedValue({ success: true, data: { ...perfil, categoria: 'Titular' } });
    rerender(vista({ ...fila }));
    await waitFor(() => expect(screen.getByText('Titular')).toBeTruthy());
    expect(getBancoDocenteCabezote).toHaveBeenCalledTimes(2);
  });
});
