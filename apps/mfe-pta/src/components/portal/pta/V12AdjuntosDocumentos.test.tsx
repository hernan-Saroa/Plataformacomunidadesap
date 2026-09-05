import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { V12AdjuntosDocumentos } from './VistasV11V15PTA';
import { getEvidenciasPTA, registrarEvidenciaPTA, uploadEvidenciaFile } from '../../../services/api/ptaApi';

vi.mock('../../../services/api/ptaApi', () => ({
  getEvidenciasPTA: vi.fn().mockResolvedValue({ success: true, data: [] }),
  registrarEvidenciaPTA: vi.fn().mockResolvedValue({ success: true }),
  uploadEvidenciaFile: vi.fn().mockResolvedValue({ success: true, data: { url: '/uploads/soporte.pdf' } }),
  eliminarEvidenciaPTA: vi.fn(),
}));
vi.mock('../../../../../shell/src/services/api', () => ({ getBaseURL: () => 'http://localhost' }));
vi.mock('./DocentePtaAlert', () => ({ docentePtaAlert: { info: vi.fn(), error: vi.fn(), success: vi.fn() } }));
vi.mock('../../../utils/officePreview', () => ({ puedePrevisualizarOffice: () => false, ESTILOS_PREVIEW_OFFICE: '' }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

const pta = { id: 'pta-1', estado: 'Aprobado', horas_docencia: 384, horas_investigacion: 200, horas_extension: 0, horas_complementarias: 170, extension_actividades: [] };

async function openForm(value: any = pta) {
  const view = render(<V12AdjuntosDocumentos ptas={[value]} userName="Docente" />);
  await waitFor(() => expect(getEvidenciasPTA).toHaveBeenCalled());
  fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [new File(['soporte'], 'soporte.pdf', { type: 'application/pdf' })] } });
  await screen.findByText('Componente del PTA *');
  return view;
}

describe('Documentos y Soportes: No aplica', () => {
  it('deshabilita Extensión vacía y no permite registrar una justificación allí', async () => {
    await openForm();
    const option = screen.getByRole('option', { name: /Extensión — No aplica/ }) as HTMLOptionElement;
    expect(option.disabled).toBe(true);
    // Incluso con un cambio de selección artificial, el envío permanece bloqueado.
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'extension' } });
    expect((screen.getByRole('button', { name: 'Sin horas disponibles' }) as HTMLButtonElement).disabled).toBe(true);
    expect(registrarEvidenciaPTA).not.toHaveBeenCalled();
    expect(uploadEvidenciaFile).not.toHaveBeenCalled();
  });

  it('solo ofrece las secciones de Extensión con carga real', async () => {
    await openForm({ ...pta, horas_extension: 40, extension_actividades: [{ seccion: 'fortalecimiento', horas: 40 }, { seccion: 'capacitacion', horas: 0 }] });
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'extension' } });
    expect(screen.getByRole('option', { name: 'Fortalecimiento (40h disponibles)' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: /Capacitación/ })).toBeNull();
    fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'fortalecimiento' } });
    fireEvent.change(screen.getByRole('spinbutton'), { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar documento' }));
    await waitFor(() => expect(registrarEvidenciaPTA).toHaveBeenCalledWith('pta-1', expect.objectContaining({ componente_pta: 'extension', seccion_extension: 'fortalecimiento', horas_avance: 10 })));
  });

  it('distingue un componente aplicable ya justificado de uno que no aplica', async () => {
    vi.mocked(getEvidenciasPTA).mockResolvedValueOnce({ success: true, data: [{ id: 'e1', componente_pta: 'investigacion', horas_avance: 200, estado_revision: 'aprobado', estado: 'activo', nombre: 'resolucion.pdf' }] } as any);
    await openForm();
    await waitFor(() => expect(screen.getByRole('option', { name: 'Investigación — Sin horas disponibles' })).toBeTruthy());
    expect(screen.getByRole('option', { name: 'Extensión — No aplica' })).toBeTruthy();
  });
});
