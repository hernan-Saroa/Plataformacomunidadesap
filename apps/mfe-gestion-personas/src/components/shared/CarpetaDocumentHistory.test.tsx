import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CarpetaDocumentHistory } from '../../../../../packages/shared-ui/src/carpeta-document-history';
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe('historial mostrado a partir del propietario', () => {
  it('muestra las versiones devueltas y descarga el ID escogido', async () => {
    const load = vi.fn().mockResolvedValue({ success: true, data: { versiones: [{ id: 'uuid-real', numero_version: 2, nombre_archivo: 'Real.pdf', fecha_creacion: '2026-10-13T12:00:00Z' }] } });
    const download = vi.fn().mockResolvedValue({ success: true, data: { url: 'blob:ficticio' } });
    vi.spyOn(window, 'open').mockReturnValue(null);
    render(<CarpetaDocumentHistory documentId="doc" name="Real.pdf" onClose={vi.fn()} load={load} download={download} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Descargar versión 2' }));
    await waitFor(() => expect(download).toHaveBeenCalledWith('doc', 'uuid-real'));
    expect(screen.queryByText('Versión 1')).toBeNull();
  });
  it('un fallo se muestra como fallo y no produce historial ni fechas simuladas', async () => {
    render(<CarpetaDocumentHistory documentId="doc" name="Archivo" onClose={vi.fn()} load={vi.fn().mockResolvedValue({ success: false, error: 'Sin historial disponible' })} download={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Sin historial disponible');
    expect(screen.queryByRole('button', { name: /Descargar versión/ })).toBeNull();
  });
  it('restauración requiere confirmación, espera al servidor y refresca el documento', async () => {
    const rows = [{ id: 'version-real', numero_version: 1, nombre_archivo: 'Original.pdf', es_version_actual: false }];
    const load = vi.fn().mockResolvedValue({ success: true, data: { versiones: rows, permite_restaurar: true } });
    let finish: any;
    const restore = vi.fn().mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const changed = vi.fn();
    render(<CarpetaDocumentHistory documentId="doc" name="Original.pdf" onClose={vi.fn()} load={load} download={vi.fn()} restore={restore} onChanged={changed} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Restaurar versión 1' }));
    expect(restore).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar restauración' }));
    await waitFor(() => expect(restore).toHaveBeenCalledWith('doc', 'version-real', ''));
    expect(changed).not.toHaveBeenCalled();
    finish({ success: true });
    await waitFor(() => expect(changed).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });
  it('una subida rechazada conserva el archivo seleccionado y muestra el error sin refrescar', async () => {
    const replace = vi.fn().mockResolvedValue({ success: false, error: 'Otra sesión modificó el documento' }), changed = vi.fn();
    render(<CarpetaDocumentHistory documentId="doc" name="Original.pdf" onClose={vi.fn()} load={vi.fn().mockResolvedValue({ success: true, data: { versiones: [], permite_restaurar: true } })} download={vi.fn()} replace={replace} onChanged={changed} />);
    const file = new File(['PDF'], 'Nuevo.pdf');
    fireEvent.change(await screen.findByLabelText('Archivo para una nueva versión'), { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText('Comentarios de la versión'), { target: { value: 'Comentario' } });
    fireEvent.click(screen.getByRole('button', { name: 'Guardar nueva versión' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Otra sesión modificó el documento');
    expect(replace).toHaveBeenCalledWith('doc', file, 'Comentario'); expect(changed).not.toHaveBeenCalled();
    expect((screen.getByLabelText('Archivo para una nueva versión') as HTMLInputElement).files?.[0]).toBe(file);
  });
});
