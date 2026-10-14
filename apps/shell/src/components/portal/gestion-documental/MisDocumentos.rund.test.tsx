import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
const state = vi.hoisted(() => ({ panel: null as any, preview: vi.fn(), download: vi.fn() }));
vi.mock('../portalApi', () => ({ getCarpetaDigitalPortal: vi.fn(), getChecklistForPersona: vi.fn(),
  getTiposDocumentos: vi.fn(), uploadDocumentoCarpetaDigital: vi.fn(), reclassifyDocumento: vi.fn() }));
vi.mock('../../../hooks/useDocumentActions', () => ({ useDocumentActions: () => ({ handlePreview: state.preview, handleDownload: state.download }) }));
vi.mock('../../shared/CarpetaDigitalSharedView', () => ({ CarpetaDigitalSharedView: (props: any) => {
  state.panel = props;
  return <div data-testid="carpeta">{props.documentos.map((d: any) => <span key={d.id}>{d.nombre}</span>)}</div>;
} }));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
import * as api from '../portalApi';
import { MisDocumentos } from './MisDocumentos';
const person = '11111111-1111-4111-8111-111111111111';
const native = { id: 'rund-service:documento:id', nombre: 'Original.pdf', categoria: 'rund', servicio_propietario: 'rund',
  persistido: true, tipo_archivo: 'pdf', tamano_bytes: 154, estado: 'pendiente', url_archivo: '/rund/api/v1/original',
  rund_perfil_id: 'PROFILE', rund_perfil_propietario: 'rund', periodo_carga: '2026-2', version_actual: 4,
  documento_logico_id: 'logical', contenido_restringido: false, revision_documento: 'a'.repeat(64) };
beforeEach(() => {
  state.panel = null;
  vi.mocked(api.getCarpetaDigitalPortal).mockResolvedValue({ success: true, data: { documentos: [native], persona: { nombre: 'Persona', email: 'persona@example.test' } } });
  vi.mocked(api.getChecklistForPersona).mockResolvedValue({ success: true, data: { tiposDocumentos: [] } });
  vi.mocked(api.getTiposDocumentos).mockResolvedValue({ success: true, data: [] });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
const mount = () => render(<MisDocumentos personaId={person} onBack={() => {}} />);
describe('El portal conserva la misma identidad documental que el banco', () => {
  it('conserva perfil, propietario, revisión, versión y URL canónicos sin inventar fecha', async () => {
    mount(); await screen.findByText('Original.pdf');
    expect(state.panel.documentos[0]).toMatchObject(native);
    expect(state.panel.documentos[0].fecha_subida).toBe('');
  });
  it('sin estado ni versión anuncia pendiente y no fabrica la versión 1', async () => {
    vi.mocked(api.getCarpetaDigitalPortal).mockResolvedValue({ success: true, data: { documentos: [{ id: 'legacy', nombre: 'Sin versión.pdf' }] } });
    mount(); await screen.findByText('Sin versión.pdf');
    expect(state.panel.documentos[0]).toMatchObject({ estado: 'pendiente', fecha_subida: '' });
    expect(state.panel.documentos[0].version_actual).toBeUndefined();
  });
  it('un fallo muestra reintento sin una carpeta vacía exitosa', async () => {
    vi.mocked(api.getCarpetaDigitalPortal).mockResolvedValueOnce({ success: false, error: '503' });
    mount(); await screen.findByRole('alert'); expect(screen.queryByTestId('carpeta')).toBeNull();
    fireEvent.click(screen.getByText('Reintentar documentos')); await screen.findByText('Original.pdf');
  });
  it('descarta una respuesta atrasada al navegar a otra persona', async () => {
    let resolve: any;
    vi.mocked(api.getCarpetaDigitalPortal).mockReturnValueOnce(new Promise(r => { resolve = r; }));
    const view = mount();
    view.rerender(<MisDocumentos personaId="otra-persona" onBack={() => {}} />);
    await screen.findByText('Original.pdf');
    resolve({ success: true, data: { documentos: [{ id: 'old', nombre: 'Persona anterior.pdf' }] } });
    await waitFor(() => expect(screen.queryByText('Persona anterior.pdf')).toBeNull());
  });
  it('los originales con propietario se descargan mediante la comprobación autenticada', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    mount(); await screen.findByText('Original.pdf');
    state.panel.onDownload(state.panel.documentos[0]); state.panel.onPreview(state.panel.documentos[0]);
    expect(state.download).toHaveBeenCalledWith(expect.objectContaining({ version_actual: 4 }));
    expect(state.preview).toHaveBeenCalled(); expect(open).not.toHaveBeenCalled(); open.mockRestore();
  });
  it('un original restringido no abre su URL alternativa ni cambia de categoría', async () => {
    vi.mocked(api.getCarpetaDigitalPortal).mockResolvedValue({ success: true, data: { documentos: [{ ...native, contenido_restringido: true, url: '/no-usar' }] } });
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    mount(); await screen.findByText('Original.pdf');
    expect(state.panel.documentos[0].url_archivo).toBeNull();
    state.panel.onDownload(state.panel.documentos[0]); state.panel.onEditCategory(state.panel.documentos[0]);
    expect(state.download).not.toHaveBeenCalled(); expect(open).not.toHaveBeenCalled(); open.mockRestore();
  });
  it('el enlace nuevo abre RUND sin alterar la ruta pública histórica de PTA', async () => {
    const open = vi.spyOn(window, 'open').mockImplementation(() => null);
    mount(); await screen.findByText('Original.pdf'); fireEvent.click(screen.getByText(/Ir a mi RUND/));
    expect(open).toHaveBeenCalledWith('/rund/autogestion/docentes?email=persona%40example.test', '_blank', 'noopener'); open.mockRestore();
  });
});
