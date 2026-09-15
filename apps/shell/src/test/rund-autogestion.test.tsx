import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AutogestionDocenteRUND } from '../../../mfe-pta/src/components/pta/banco-docentes/AutogestionDocenteRUND';
import { apiClient } from '../services/api';
import { vincularRundSoporte } from '../../../mfe-pta/src/services/api/ptaApi';

vi.mock('../services/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), put: vi.fn() } }));
vi.mock('../../../mfe-pta/src/services/api/ptaApi', () => ({ vincularRundSoporte: vi.fn() }));
vi.mock('../components/assets/ESAPLogo', () => ({ ESAPLogo: () => <span>ESAP</span> }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('Autogestión RUND con respuestas reales del cliente API', () => {
  it('conserva el perfil y reintenta solo los archivos fallidos sin mostrar éxito prematuro', async () => {
    vi.mocked(apiClient.post).mockImplementation(async url => url.endsWith('/validate')
      ? { success: true, sessionToken: 'a'.repeat(64) }
      : url.includes('/submit/') ? { docenteId: 'docente-prueba', personaId: 'persona-prueba' } : { success: true });
    vi.mocked(apiClient.get).mockImplementation(async url => url.includes('/drafts/')
      ? { draft: { nombreCompleto: 'DOCENTE PRUEBA', documento_identidad: '******4050', terminosAceptados: true } }
      : { nombre_completo: 'DOCENTE PRUEBA', documento_identidad: '******4050', correo_institucional: 'prueba@esap.edu.co' });
    vi.mocked(vincularRundSoporte).mockResolvedValueOnce({ success: true, data: {} })
      .mockResolvedValueOnce({ success: false, data: null, message: 'Fallo de almacenamiento' })
      .mockResolvedValueOnce({ success: true, data: {} });
    const { container } = render(<AutogestionDocenteRUND />);
    fireEvent.change(screen.getByPlaceholderText('ejemplo@esap.edu.co'), { target: { value: 'prueba@esap.edu.co' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar Código OTP/ }));
    await screen.findByText('Confirmación de Identidad');
    [...container.querySelectorAll('input[maxlength="1"]')].forEach((input, index) => fireEvent.change(input, { target: { value: String(index + 1) } }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Código/ }));
    await screen.findByDisplayValue('DOCENTE PRUEBA');
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Documentos/ }));
    const inputs = container.querySelectorAll('input[type="file"]');
    fireEvent.change(inputs[0], { target: { files: [new File(['%PDF-1.7'], 'identidad.pdf', { type: 'application/pdf' })] } });
    fireEvent.change(inputs[1], { target: { files: [new File(['%PDF-1.7'], 'diploma.pdf', { type: 'application/pdf' })] } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar mi Información/ }));
    await screen.findByText(/Sus datos quedaron guardados, pero 1 archivo/);
    expect(screen.queryByText('¡Registro Completado!')).toBeNull();
    expect(screen.getByRole('button', { name: 'Volver a Datos' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /Enviar mi Información/ }));
    await screen.findByText('¡Registro Completado!');
    expect(vi.mocked(apiClient.post).mock.calls.filter(([url]) => url.includes('/submit/'))).toHaveLength(1);
    expect(vincularRundSoporte).toHaveBeenCalledTimes(3);
    expect(vi.mocked(vincularRundSoporte).mock.calls[2][2].tipoSoporte).toBe('diploma_pregrado');
  });

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
  it('al ingresar otra vez recupera del perfil los soportes aprobados y los motivos de devolución', async () => {
    vi.mocked(apiClient.post).mockImplementation(async url => url.endsWith('/validate')
      ? { success: true, sessionToken: 'b'.repeat(64) } : { success: true });
    vi.mocked(apiClient.get).mockImplementation(async url => url.includes('/drafts/')
      ? { draft: { terminosAceptados: true } }
      : { nombre_completo: 'PERFIL GUARDADO', documento_identidad: '******4050', correo_institucional: 'prueba@esap.edu.co',
        evidencias: {
          soportes: [
            { bloque: 'IDENTIDAD', tipo_soporte: 'documento_identidad', nombre_archivo: 'identidad-guardada.pdf', estado: 'Aprobado' },
            { bloque: 'FORMACION', tipo_soporte: 'diploma_pregrado', nombre_archivo: 'diploma-devuelto.pdf', estado: 'Rechazado', correccion_requerida: 'Adjunte el diploma completo.' },
          ],
          bloques: [{ bloque: 'IDENTIDAD', estado: 'Aprobado' }],
        } });
    const { container } = render(<AutogestionDocenteRUND />);
    fireEvent.change(screen.getByPlaceholderText('ejemplo@esap.edu.co'), { target: { value: 'prueba@esap.edu.co' } });
    fireEvent.click(screen.getByRole('button', { name: /Enviar Código OTP/ }));
    await screen.findByText('Confirmación de Identidad');
    [...container.querySelectorAll('input[maxlength="1"]')].forEach((input, index) => fireEvent.change(input, { target: { value: String(index + 1) } }));
    fireEvent.click(screen.getByRole('button', { name: /Confirmar Código/ }));
    await screen.findByDisplayValue('PERFIL GUARDADO');
    fireEvent.click(screen.getByRole('button', { name: /Continuar a Documentos/ }));
    expect(await screen.findByText('✓ Aprobado: identidad-guardada.pdf')).toBeInTheDocument();
    expect(screen.getByText('✓ Espacio aprobado')).toBeInTheDocument();
    expect(screen.getByText('Devuelto: diploma-devuelto.pdf')).toBeInTheDocument();
    expect(screen.getByText('Corrección requerida: Adjunte el diploma completo.')).toBeInTheDocument();
    expect(vincularRundSoporte).not.toHaveBeenCalled();
  });

});
