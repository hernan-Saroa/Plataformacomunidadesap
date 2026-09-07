import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AutogestionDocenteRUND } from '../../../mfe-pta/src/components/pta/banco-docentes/AutogestionDocenteRUND';
import { apiClient } from '../services/api';

vi.mock('../services/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../../../mfe-pta/src/services/api/ptaApi', () => ({ vincularRundSoporte: vi.fn() }));
vi.mock('../components/assets/ESAPLogo', () => ({ ESAPLogo: () => <span>ESAP</span> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Autogestión RUND con respuestas reales del cliente API', () => {
  it('valida OTP, recupera el borrador enmascarado y guarda otros campos sin exponer puntaje', async () => {
    const session = 'a'.repeat(64);
    vi.mocked(apiClient.post).mockImplementation(async (url) => url.endsWith('/validate')
      ? { success: true, sessionToken: session } : { success: true });
    vi.mocked(apiClient.get).mockImplementation(async (url) => url.includes('/drafts/')
      ? { draft: { nombreCompleto: 'NOMBRE EN BORRADOR', documento_identidad: '******4050', telefono: '3001234567', puntajeSalarial: null } }
      : { nombre_completo: 'NOMBRE PERSISTIDO', documento_identidad: '******4050', puntaje_salarial: null,
        correo_institucional: 'prueba@esap.edu.co', proteccion_datos: { acceso_completo: false } });
    vi.mocked(apiClient.put).mockResolvedValue({ success: true });
    const { container } = render(<AutogestionDocenteRUND />);
    fireEvent.change(screen.getByPlaceholderText('ejemplo@esap.edu.co'), { target: { value: 'prueba@esap.edu.co' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar Código OTP/ }));
    await screen.findByText('Confirmación de Identidad');
    [...container.querySelectorAll('input[maxlength="1"]')].forEach((input, index) => {
      fireEvent.change(input, { target: { value: String(index + 1) } });
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Código/ }));
    await screen.findByDisplayValue('NOMBRE EN BORRADOR');
    expect(screen.getByDisplayValue('******4050')).toHaveAttribute('readonly');
    expect(screen.getByDisplayValue('Información restringida')).toHaveAttribute('readonly');
    expect(container.innerHTML).not.toContain('1020304050');
    fireEvent.change(screen.getByDisplayValue('3001234567'), { target: { value: '3007654321' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar borrador/ }));
    await waitFor(() => expect(apiClient.put).toHaveBeenCalledWith(`/pta/api/v1/banco-docentes/drafts/${session}`,
      expect.objectContaining({ telefono: '3007654321', documento_identidad: '******4050', puntajeSalarial: '' })));
  });
});
