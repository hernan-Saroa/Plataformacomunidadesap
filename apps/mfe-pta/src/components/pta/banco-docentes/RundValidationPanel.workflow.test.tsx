import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RundValidationPanel } from './RundValidationPanel';
import { apiClient } from '../../../../../shell/src/services/api';

vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), upload: vi.fn() } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ userRole: 'SUPER_ADMIN', isSuperUser: true, hasAnyPermission: () => true }) }));
vi.mock('./BancoDocenteEditModal', () => ({ BancoDocenteEditModal: () => null }));
vi.mock('./RundDocumentManager', () => ({ RundDocumentManager: ({ onChanged }: any) => <button onClick={onChanged}>Recargar expediente</button> }));

let blocks: any[];
beforeEach(() => {
  vi.clearAllMocks();
  blocks = ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'].map(bloque => ({ bloque, estado: 'Soporte faltante', soportes: [] }));
  blocks[0] = { bloque: 'IDENTIDAD', estado: 'En revisión', soportes: [{ id: 'soporte-1', tipo_soporte: 'documento_identidad', documento_perfil_id: 'version-1', documento_carpeta_id: '/pta/documento-1', nombre_archivo: 'identidad.pdf', estado: 'Pendiente' }] };
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url.includes('/bloques')) return JSON.parse(JSON.stringify(blocks));
    if (url.includes('/auditoria')) return [{ id: 'log-1', accion: 'CARGAR_DOCUMENTO', bloque: 'IDENTIDAD', actorId: 'CARGADOR', createdAt: '2026-09-08T12:00:00Z', metadata: { version: 1, nombreArchivo: 'identidad.pdf' } }];
    return { docenteId: 'docente-1', idRund: 'RUND-PRUEBA', proteccion_datos: { acceso_completo: true }, bloques: {} };
  });
  vi.mocked(apiClient.post).mockImplementation(async (url: string, body: any) => {
    if (url.endsWith('/revision')) {
      blocks[0].soportes[0].estado = body.estado;
      blocks[0].soportes[0].observacion = body.observacion;
      blocks[0].estado = body.estado === 'Rechazado' ? 'Devuelto' : 'En revisión';
    } else if (url.endsWith('/aprobar')) {
      blocks[0].estado = 'Aprobado';
      blocks[0].fecha_revision = '2026-09-08T12:00:00Z';
    }
    return { success: true };
  });
});
afterEach(cleanup);

describe('Revisión documental persistida en el panel RUND', () => {
  it('registra la decisión con la versión vigente y después aprueba el espacio', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    const approve = (await screen.findAllByRole('button', { name: 'Aprobar', exact: true }))[0];
    expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(approve);
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/soportes/soporte-1/revision'), expect.objectContaining({ estado: 'Aprobado', documentoVersionId: 'version-1' })));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar bloque' }));
    expect(await screen.findByText('Espacio aprobado')).toBeTruthy();
    expect(vi.mocked(apiClient.post).mock.calls.some(([url]) => url.includes('validacion-documental/batch'))).toBe(false);
  });

  it('exige motivo antes de devolver y muestra la corrección solicitada', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Devolver', exact: true }))[0]);
    const confirm = screen.getByRole('button', { name: 'Confirmar devolución' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Motivo y corrección requerida'), { target: { value: 'Adjunte el documento de la persona registrada.' } });
    fireEvent.click(confirm);
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/revision'), expect.objectContaining({ estado: 'Rechazado', observacion: 'Adjunte el documento de la persona registrada.' })));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect((await screen.findAllByText('Adjunte el documento de la persona registrada.')).length).toBeGreaterThan(0);
  });

  it('descarta las aprobaciones anteriores cuando llega un reemplazo pendiente', async () => {
    blocks[0].estado = 'Aprobado';
    blocks[0].soportes[0].estado = 'Aprobado';
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('Espacio aprobado');
    blocks[0].estado = 'En revisión';
    blocks[0].soportes[0] = { ...blocks[0].soportes[0], estado: 'Pendiente', documento_perfil_id: 'version-2', documento_carpeta_id: '/pta/documento-2' };
    fireEvent.click(screen.getByRole('button', { name: 'Recargar expediente' }));
    await screen.findAllByRole('button', { name: 'Aprobar', exact: true });
    expect(screen.queryByText('Espacio aprobado')).toBeNull();
    fireEvent.click(screen.getAllByRole('button', { name: 'Aprobar', exact: true })[0]);
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/revision'), expect.objectContaining({ documentoVersionId: 'version-2' })));
  });

  it('expone archivo, actor y versión en la trazabilidad', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ver trazabilidad de revisiones y documentos' }));
    expect(screen.getByText('identidad.pdf')).toBeTruthy();
    expect(screen.getByText('Versión 1')).toBeTruthy();
    expect(screen.getByText(/CARGADOR/)).toBeTruthy();
  });
  it('recupera las aprobaciones del servidor al montar una pantalla nueva', async () => {
    const first = render(<RundValidationPanel docenteId="docente-1" />);
    fireEvent.click((await screen.findAllByRole('button', { name: 'Aprobar', exact: true }))[0]);
    await waitFor(() => expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar bloque' }));
    await screen.findByText('Espacio aprobado');
    first.unmount();
    vi.mocked(apiClient.get).mockClear();
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('Espacio aprobado');
    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('/docente-1/bloques'));
  });

  it('ante un fallo del servidor no inventa estados usando los datos de la tabla', async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error('Servidor no disponible'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<RundValidationPanel docenteId="docente-1" docente={{ nombre_completo: 'DOCENTE TABLA', documento_identidad: '12345' }} />);
    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo verificar el estado vigente');
    expect(screen.queryByRole('button', { name: 'Aprobar bloque' })).toBeNull();
    expect(screen.queryByText('RUND-12345')).toBeNull();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
    expect(apiClient.post).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('descarta respuestas tardías de otro docente al cambiar de expediente', async () => {
    const pending: Array<() => void> = [];
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      const old = url.includes('/docente-1/');
      const result = url.includes('/bloques') ? blocks.map(b => ({ ...b, estado: old ? 'Aprobado' : 'En revisión' }))
        : url.includes('/auditoria') ? [] : { docenteId: old ? 'docente-1' : 'docente-2', idRund: old ? 'RUND-ANTERIOR' : 'RUND-ACTUAL', bloques: {} };
      return old ? new Promise(resolve => pending.push(() => resolve(result))) : result;
    });
    const view = render(<RundValidationPanel docenteId="docente-1" />);
    view.rerender(<RundValidationPanel docenteId="docente-2" />);
    await screen.findByText('RUND-ACTUAL');
    await act(async () => { pending.forEach(resolve => resolve()); });
    expect(screen.queryByText('RUND-ANTERIOR')).toBeNull();
    expect(screen.queryByText('Espacio aprobado')).toBeNull();
    expect(screen.getByText('RUND-ACTUAL')).toBeTruthy();
  });

});
