// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ get: vi.fn(), cambiar: vi.fn() }));
vi.mock('../../../services/api/interoperabilidadApi', () => ({
  getInteroperabilidad: api.get,
  cambiarInteroperabilidad: api.cambiar,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { TabInteroperabilidad } from './TabInteroperabilidad';

const base = {
  habilitada: false, desdePeriodo: '2026-1', origen: 'por_defecto' as const, motivo: null, cambiadoPor: null, cambiadoEn: null,
  impacto: { concertacionesEnCurso: 3, ptasConDocenciaAplicada: 5, decisionesPendientes: 2 },
};

describe('EFDS-2435 · pestaña Interoperabilidad (PTA → Configuración)', () => {
  beforeEach(() => { api.get.mockResolvedValue({ ...base }); api.cambiar.mockReset(); });
  afterEach(cleanup);

  it('muestra el estado, el origen y el corte; el interruptor abre el modal de confirmación (no un diálogo del navegador)', async () => {
    render(<TabInteroperabilidad />);
    expect(await screen.findByText(/Apagada — la docencia se registra a mano/)).toBeTruthy();
    expect(screen.getByText('Valor por defecto (apagado)')).toBeTruthy();
    expect((screen.getByPlaceholderText('2026-1') as HTMLInputElement).value).toBe('2026-1');
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText(/2 pendiente/)).toBeTruthy();
  });

  it('exige motivo de al menos 10 caracteres antes de poder confirmar', async () => {
    render(<TabInteroperabilidad />);
    await screen.findByRole('switch');
    fireEvent.click(screen.getByRole('switch'));
    const confirmar = screen.getByRole('button', { name: 'Confirmar' }) as HTMLButtonElement;
    expect(confirmar.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), { target: { value: 'corto' } });
    expect(confirmar.disabled).toBe(true);
    fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), { target: { value: 'Habilitar para probar el flujo' } });
    expect(confirmar.disabled).toBe(false);
  });

  it('al apagar, el modal muestra el impacto (concertaciones en curso y PTA con docencia aplicada) y que no se borra nada', async () => {
    api.get.mockResolvedValue({ ...base, habilitada: true, origen: 'base' });
    render(<TabInteroperabilidad />);
    await screen.findByText(/Encendida — la docencia llega/);
    fireEvent.click(screen.getByRole('switch'));
    expect(screen.getByText(/concertación\(es\) en curso: siguen su camino/)).toBeTruthy();
    expect(screen.getByText(/PTA con docencia aplicada desde Programación Académica/)).toBeTruthy();
    expect(screen.getByText(/No se borra nada/)).toBeTruthy();
  });

  it('al encender muestra el resultado: aplicadas, en conflicto y omitidas', async () => {
    api.cambiar.mockResolvedValue({
      config: { ...base, habilitada: true, origen: 'base', motivo: 'Habilitar para probar el flujo' },
      resultado: { aplicadas: 4, conflicto: 1, omitidas: 2, errores: [] }, impacto: base.impacto,
    });
    render(<TabInteroperabilidad />);
    await screen.findByRole('switch');
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.change(screen.getByRole('textbox', { name: /Motivo/ }), { target: { value: 'Habilitar para probar el flujo' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    await waitFor(() => expect(api.cambiar).toHaveBeenCalledWith({ habilitada: true, desdePeriodo: '2026-1', motivo: 'Habilitar para probar el flujo' }));
    expect(await screen.findByText(/4 aplicada\(s\), 1 en conflicto/)).toBeTruthy();
    expect(screen.getByText(/2 omitida\(s\)/)).toBeTruthy();
  });

  it('sin permiso (403) no muestra el interruptor', async () => {
    api.get.mockRejectedValue({ status: 403 });
    render(<TabInteroperabilidad />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('un corte mal escrito no se puede guardar', async () => {
    render(<TabInteroperabilidad />);
    await screen.findByRole('switch');
    fireEvent.change(screen.getByPlaceholderText('2026-1'), { target: { value: '2026-3' } });
    expect((screen.getByRole('button', { name: /Guardar periodo de corte/ }) as HTMLButtonElement).disabled).toBe(true);
  });
});
