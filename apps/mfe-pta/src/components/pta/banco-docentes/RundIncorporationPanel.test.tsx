import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RundIncorporationPanel } from './RundIncorporationPanel';
import { apiClient } from '../../../../../shell/src/services/api';
vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: { post: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
const support = { id: 'support', tipo_soporte: 'contrato', documento_perfil_id: 'version', nombre_archivo: 'contrato.pdf', estado: 'Pendiente' };
const props = { docenteId: 'docente', block: { version: 4, soportes: [support] }, fields: [], onSaved: vi.fn() };
beforeEach(() => { vi.clearAllMocks(); vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: { changed: true } }); });
afterEach(cleanup);
describe('Datos de contratación separados de la edición general', () => {
  it('exige soporte vigente antes de ofrecer registro', () => {
    render(<RundIncorporationPanel {...props} block={{ version: 4, soportes: [{ ...support, estado: 'Rechazado' }] }} />);
    expect(screen.getByRole('status').textContent).toContain('Carga primero');
    expect(screen.queryByRole('button', { name: 'Guardar datos de contratación' })).toBeNull();
  });
  it('envía únicamente contrato, fechas, motivo y versión del soporte', async () => {
    render(<RundIncorporationPanel {...props} />);
    fireEvent.change(screen.getByLabelText('Número de contrato o acto'), { target: { value: 'Contrato de prueba' } });
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2026-01-01' } });
    fireEvent.change(screen.getByLabelText('Justificación'), { target: { value: 'Registro soportado en el contrato.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar datos de contratación' }));
    await waitFor(() => expect(props.onSaved).toHaveBeenCalledTimes(1));
    expect(apiClient.post).toHaveBeenCalledWith('/pta/api/v1/pta/banco-docentes/docente/incorporacion', {
      numeroContrato: 'Contrato de prueba', fechaContratacion: '2026-01-01', fechaFin: null,
      soporteId: 'support', documentoVersionId: 'version', blockVersion: 4, justificacion: 'Registro soportado en el contrato.',
    }, expect.anything());
  });
});
