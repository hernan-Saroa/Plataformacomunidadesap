import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import PazYSalvoCoordinadora from './PazYSalvoCoordinadora';
import { pazYSalvoService as api } from './pazYSalvoService';
vi.mock('./pazYSalvoService', () => ({ pazYSalvoService: {
  buscar: vi.fn(), consultar: vi.fn(), solicitar: vi.fn(), otp: vi.fn(), firmar: vi.fn(), detalle: vi.fn(), descargar: vi.fn(),
} }));
const persona = { id: 'persona', nombre: 'Comisionada prueba', documento: '9001' };
const doc = { id: 'documento', creado_en: '2026-09-25T12:00:00Z', firmado_en: null,
  solicitado_por_id: 'coordinadora', contenido: { nombre: persona.nombre, documento: '9001', coordinadoraNombre: 'Coordinadora' } };
async function buscar() {
  render(<PazYSalvoCoordinadora />);
  fireEvent.change(screen.getByLabelText('Nombre o documento'), { target: { value: '9001' } });
  fireEvent.click(screen.getByRole('button', { name: 'Buscar' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Comisionada prueba · 9001' }));
  await screen.findByText('Documentos registrados');
}
beforeEach(() => { vi.resetAllMocks(); vi.mocked(api.buscar).mockResolvedValue([persona]); });
describe('EFDS-1311 :: interfaz', () => {
  it('EFDS-1311 :: AC-02 :: enumera pendientes y deshabilita emisión', async () => {
    vi.mocked(api.consultar).mockResolvedValue({ pendiente: true, documentos: [], comisiones: [
      { id: 's', codigo: 'COM-2026-9003', estado: 'PAGADA', fechaLimite: null },
    ] });
    await buscar();
    expect(screen.getByText('COM-2026-9003')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Preparar paz y salvo' })).toBeDisabled();
    expect(api.solicitar).not.toHaveBeenCalled();
  });
  it('EFDS-1311 :: AC-01 :: prepara, pide OTP y firma en el servidor', async () => {
    vi.mocked(api.consultar).mockResolvedValue({ pendiente: false, documentos: [], comisiones: [] });
    vi.mocked(api.solicitar).mockResolvedValue(doc);
    vi.mocked(api.otp).mockResolvedValue({ email: 'coordinadora@example.invalid' });
    vi.mocked(api.firmar).mockResolvedValue({ ...doc, firmado_en: doc.creado_en });
    await buscar();
    fireEvent.click(screen.getByRole('button', { name: 'Preparar paz y salvo' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Solicitar código' }));
    await screen.findByText('Código enviado a coordinadora@example.invalid.');
    fireEvent.change(screen.getByLabelText('Código de seis dígitos'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verificar y firmar' }));
    await screen.findByText('Paz y salvo firmado y disponible para descarga.');
    expect(api.firmar).toHaveBeenCalledWith('documento', '123456');
  });
  it('EFDS-1311 :: AC-03 :: recupera historial y descarga documento persistido', async () => {
    const firmado = { ...doc, firmado_en: doc.creado_en };
    vi.mocked(api.consultar).mockResolvedValue({ pendiente: false, documentos: [firmado], comisiones: [] });
    vi.mocked(api.detalle).mockResolvedValue({ ...firmado, eventos: [{ id: 1, accion: 'FIRMA_VERIFICADA', usuario_id: 'coordinadora', creado_en: doc.creado_en }] });
    vi.mocked(api.descargar).mockResolvedValue(undefined);
    await buscar();
    fireEvent.click(screen.getByRole('button', { name: 'Consultar' }));
    await screen.findByText('Trazabilidad');
    fireEvent.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    await waitFor(() => expect(api.descargar).toHaveBeenCalledWith('documento'));
  });
});
