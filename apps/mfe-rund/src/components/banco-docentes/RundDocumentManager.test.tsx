import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RundDocumentManager } from './RundDocumentManager';
import { apiClient } from '../../../../../shell/src/services/api';
import { toast } from 'sonner';

vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn(), upload: vi.fn(), getBlob: vi.fn(), delete: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const docs = [
  { id: 'identity', categoria: 'IDENTIDAD', categoriaNombre: 'Identidad', nombreArchivo: 'Identificación.pdf', descripcion: 'Documento personal', estado: 'ACTIVO', estadoRevision: 'Aprobado', version: 2, totalVersiones: 2, tamanoBytes: 100, contenidoUrl: '/identity', creadoPor: 'Gestor' },
  { id: 'degree', categoria: 'TITULOS', categoriaNombre: 'Títulos', nombreArchivo: 'Maestría.pdf', descripcion: 'Formación profesional', estado: 'ACTIVO', version: 1, totalVersiones: 1, tamanoBytes: 100, contenidoUrl: '/degree' },
  { id: 'restricted', categoria: 'IDENTIDAD', categoriaNombre: 'Identidad', nombreArchivo: 'Restringido.pdf', estado: 'ACTIVO', version: 1, totalVersiones: 1, contenidoUrl: '/restricted', contenidoRestringido: true },
];
const old = { ...docs[0], id: 'old', nombreArchivo: 'Identificación anterior.pdf', estado: 'REEMPLAZADO', version: 1, contenidoUrl: '/old' };
const props = { docenteId: 'docente-1', canManage: true, onView: vi.fn(), onChanged: vi.fn(), evidenceOptions: [{ block: 'IDENTIDAD', type: 'documento_identidad', label: 'Documento de identidad' }] };
const row = (name: string) => within(screen.getByText(name).closest('article')!);
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => url.endsWith('/categorias')
    ? [{ codigo: 'IDENTIDAD', nombre: 'Identidad' }, { codigo: 'TITULOS', nombre: 'Títulos' }]
    : url.endsWith('historial=true') ? [...docs, old] : docs);
  vi.mocked(apiClient.upload).mockResolvedValue({ success: true });
  vi.mocked(apiClient.delete).mockResolvedValue({ success: true });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Biblioteca compacta de documentos RUND', () => {
  it('bloquea una selección anterior si el dato dejó de estar disponible', async () => {
    const view = render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar documento' }));
    fireEvent.change(screen.getByLabelText('Información que acredita'), { target: { value: 'documento_identidad' } });
    view.rerender(<RundDocumentManager {...props} evidenceOptions={[]} />);
    fireEvent.change(screen.getByLabelText('Cargar PDF'), { target: { files: [new File(['%PDF-1.7'], 'nuevo.pdf', { type: 'application/pdf' })] } });
    expect(apiClient.upload).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('Registre primero'));
  });

  it('conserva consulta de soportes sin datos, pero oculta el reemplazo', async () => {
    vi.mocked(apiClient.get).mockImplementation(async url => url.endsWith('/categorias') ? [] : [{ ...docs[1], tipoSoporte: 'diploma_maestria' }]);
    render(<RundDocumentManager {...props} evidenceOptions={[]} />);
    await screen.findByText('Maestría.pdf');
    expect(row('Maestría.pdf').getByTitle('Visualizar')).toBeTruthy();
    expect(row('Maestría.pdf').queryByTitle('Reemplazar PDF')).toBeNull();
    expect(screen.queryByLabelText(/Reemplazar/)).toBeNull();
  });

  it('combina búsqueda sin tildes y categoría sin consultar de nuevo el servidor', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Maestría.pdf');
    const requests = vi.mocked(apiClient.get).mock.calls.length;
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'formacion' } });
    expect(screen.getByText('Maestría.pdf')).toBeTruthy();
    expect(screen.queryByText('Identificación.pdf')).toBeNull();
    fireEvent.change(screen.getByLabelText('Filtrar documentos por categoría'), { target: { value: 'IDENTIDAD' } });
    expect(screen.getByText(/No hay documentos que coincidan/)).toBeTruthy();
    expect(apiClient.get).toHaveBeenCalledTimes(requests);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: '' } });
    expect(screen.getByText('Identificación.pdf')).toBeTruthy();
    expect(screen.queryByText('Maestría.pdf')).toBeNull();
  });

  it('permite contraer y volver a abrir sin perder archivos ni hacer escrituras', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Contraer documentos' }));
    expect(screen.queryByRole('region', { name: 'Lista de documentos del perfil' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Expandir documentos' }));
    expect(screen.getByText('Identificación.pdf')).toBeTruthy();
    expect(apiClient.upload).not.toHaveBeenCalled();
    expect(apiClient.delete).not.toHaveBeenCalled();
  });

  it('conserva la visualización y las restricciones del contenido original', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(row('Identificación.pdf').getByTitle('Visualizar'));
    expect(props.onView).toHaveBeenCalledWith('/identity', 'Identificación.pdf', 'Identidad');
    expect(row('Restringido.pdf').queryByTitle('Visualizar')).toBeNull();
    expect(row('Restringido.pdf').queryByTitle('Descargar')).toBeNull();
  });

  it('abre la carga y conserva el archivo, categoría y punto de control enviados', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    expect(screen.queryByLabelText('Categoría documental')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Agregar documento' }));
    fireEvent.change(screen.getByLabelText('Información que acredita'), { target: { value: 'documento_identidad' } });
    fireEvent.change(screen.getByLabelText('Descripción del documento'), { target: { value: 'Nueva identificación' } });
    const file = new File(['%PDF-1.7'], 'nuevo.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText('Cargar PDF'), { target: { files: [file] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalled());
    const [url, form] = vi.mocked(apiClient.upload).mock.calls[0];
    expect(url).toBe('/pta/api/v1/pta/banco-docentes/docente-1/documentos');
    expect((form as FormData).get('file')).toBe(file);
    expect((form as FormData).get('categoria')).toBe('IDENTIDAD');
    expect((form as FormData).get('tipoSoporte')).toBe('documento_identidad');
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
  });

  it('descarga el archivo seleccionado y libera la URL temporal', async () => {
    const blob = new Blob(['%PDF-1.7'], { type: 'application/pdf' });
    vi.mocked(apiClient.getBlob).mockResolvedValue(blob);
    const createObjectURL = vi.fn().mockReturnValue('blob:documento-prueba');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', class extends URL { static createObjectURL = createObjectURL; static revokeObjectURL = revokeObjectURL; });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('Maestr\u00eda.pdf');
    });
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Maestr\u00eda.pdf');
    fireEvent.click(row('Maestr\u00eda.pdf').getByTitle('Descargar'));
    await waitFor(() => expect(apiClient.getBlob).toHaveBeenCalledWith('/degree?download=true'));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:documento-prueba');
  });

  it('abre directamente la carga incluso si el panel se contrajo con ella abierta', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificaci\u00f3n.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar documento' }));
    fireEvent.click(screen.getByRole('button', { name: 'Contraer documentos' }));
    fireEvent.click(screen.getByRole('button', { name: 'Agregar documento' }));
    expect(screen.getByLabelText('Categor\u00eda documental')).toBeTruthy();
  });

  it('conserva reemplazos y confirmación de eliminación sobre el archivo seleccionado', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    const input = row('Identificación.pdf').getByTitle(/Reemplazar/).querySelector('input')!;
    fireEvent.change(input, { target: { files: [new File(['%PDF-1.7'], 'v3.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalledWith(expect.stringContaining('/identity/reemplazo'), expect.any(FormData)));
    await waitFor(() => expect(props.onChanged).toHaveBeenCalled());
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(row('Maestría.pdf').getByTitle('Eliminar'));
    expect(apiClient.delete).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(row('Maestría.pdf').getByTitle('Eliminar'));
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith('/pta/api/v1/pta/banco-docentes/docente-1/documentos/degree'));
  });

  it('consulta versiones anteriores y mantiene inactivas sus acciones de modificación', async () => {
    render(<RundDocumentManager {...props} />);
    await screen.findByText('Identificación.pdf');
    fireEvent.click(screen.getByRole('button', { name: 'Historial' }));
    await screen.findByText('Identificación anterior.pdf');
    expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('historial=true'));
    expect(row('Identificación anterior.pdf').queryByTitle('Eliminar')).toBeNull();
    expect(row('Identificación anterior.pdf').queryByTitle(/Reemplazar/)).toBeNull();
    fireEvent.click(row('Identificación anterior.pdf').getByTitle('Visualizar'));
    expect(props.onView).toHaveBeenCalledWith('/old', 'Identificación anterior.pdf', 'Identidad');
    fireEvent.click(screen.getByRole('button', { name: 'Ver vigentes' }));
    await waitFor(() => expect(screen.queryByText('Identificación anterior.pdf')).toBeNull());
  });

  it('mantiene el acceso de solo consulta', async () => {
    render(<RundDocumentManager {...props} canManage={false} />);
    await screen.findByText('Identificación.pdf');
    expect(screen.queryByRole('button', { name: 'Agregar documento' })).toBeNull();
    expect(screen.queryAllByTitle('Eliminar')).toHaveLength(0);
    expect(screen.queryAllByTitle(/Reemplazar/)).toHaveLength(0);
    expect(row('Identificación.pdf').getByTitle('Descargar')).toBeTruthy();
  });
});
