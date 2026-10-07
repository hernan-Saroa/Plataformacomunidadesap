import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AutogestionDocenteRUND } from './AutogestionDocenteRUND';
import { apiClient } from '../../../../../shell/src/services/api';

vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../../../../../shell/src/components/assets/ESAPLogo', () => ({ ESAPLogo: () => null }));
vi.mock('./PerfilDocenteCabezote', () => ({ PerfilDocenteCabezote: () => null }));
vi.mock('../../../services/api/ptaApi', () => ({ vincularRundSoporte: vi.fn() }));

const policy = { texto: 'Aviso institucional de prueba para el tratamiento documental.', url: 'https://example.test/politica', huella: 'hash-del-servidor' };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockImplementation(async url => url.includes('/drafts/')
    ? { draft: { documento_identidad: '123456', nombreCompleto: 'DOCENTE PRUEBA', terminosAceptados: true } }
    : { data: null });
  vi.mocked(apiClient.post).mockImplementation(async url => url.endsWith('/otp/request') ? { success: true }
    : url.endsWith('/otp/validate') ? { success: true, sessionToken: 'sesion', politicaTratamiento: policy }
    : { docenteId: 'docente' });
});
afterEach(cleanup);

async function enter() {
  const view = render(<AutogestionDocenteRUND />);
  fireEvent.change(screen.getByPlaceholderText('ejemplo@esap.edu.co'), { target: { value: 'docente@example.test' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar Código OTP' }));
  await screen.findByRole('button', { name: 'Confirmar Código' });
  view.container.querySelectorAll('input[maxlength="1"]').forEach((input, index) => fireEvent.change(input, { target: { value: String(index + 1) } }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar Código' }));
}

describe('Aceptación del aviso presentado por el backend', () => {
  it('muestra el aviso, exige nueva aceptación al cargar borrador y envía su huella', async () => {
    await enter();
    await screen.findByText(policy.texto, { exact: false });
    expect(screen.getByRole('link', { name: 'Consultar la política de tratamiento' }).getAttribute('href')).toBe(policy.url);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Documentos/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar mi Información' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/banco-docentes/submit/sesion',
      expect.objectContaining({ terminosAceptados: true, politicaTratamientoHuella: policy.huella })));
  });

  it('conserva el aviso original cuando todavía responde el backend anterior', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, sessionToken: 'sesion' });
    await enter();
    await screen.findByText(/Autorizo de manera voluntaria, previa/);
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Documentos/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Enviar mi Información' }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/banco-docentes/submit/sesion',
      expect.objectContaining({ terminosAceptados: true, politicaTratamientoHuella: undefined })));
  });

  it.each([null, { texto: 'incompleto' }, { texto: {}, huella: 'hash', url: '' }])('rechaza un aviso inválido (%j) sin sustituirlo por el anterior', async politicaTratamiento => {
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, sessionToken: 'sesion', politicaTratamiento });
    await enter();
    await screen.findByText('No se pudo consultar la política de tratamiento. Inténtalo nuevamente.');
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
