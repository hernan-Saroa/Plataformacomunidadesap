import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { RundValidationPanel } from './RundValidationPanel';
import { apiClient } from '../../../../../shell/src/services/api';
import { toast } from 'sonner';

vi.mock('../../../../../shell/src/services/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), upload: vi.fn(), getBlob: vi.fn(), delete: vi.fn() } }));
vi.mock('sonner', () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), warning: vi.fn() }) }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ userRole: 'SUPER_ADMIN', isSuperUser: true, hasAnyPermission: () => true }) }));
vi.mock('./BancoDocenteEditModal', () => ({ BancoDocenteEditModal: () => null }));
// El gestor real entrega la tabla de soportes a través de renderSupportTable.
vi.mock('./RundDocumentManager', () => ({
  RundDocumentManager: ({ renderSupportTable }: any) => <>{renderSupportTable?.({ accionesExtra: () => null })}</>,
}));

let profileBlocks: Record<string, any>;
let soportes: any[];
const pdf = () => new File(['%PDF-1.7'], 'diploma.pdf', { type: 'application/pdf' });
const formacion = () => ({ bloque: 'FORMACION', version: 1, estado: 'En revisión', soportes, revisionDatos: {} });

beforeEach(() => {
  vi.clearAllMocks();
  soportes = [];
  profileBlocks = { FORMACION: { campos: [
    { campo: 'TITULO_PREGRADO', valor: 'Abogado' },
    { campo: 'TITULOS_ADICIONALES', valor: { pregrado: ['Contador Público', 'Economista'] } },
  ] } };
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url.includes('/bloques')) return ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL']
      .map(bloque => bloque === 'FORMACION' ? formacion() : { bloque, version: 1, estado: 'Soporte faltante', soportes: [], revisionDatos: {} });
    if (url.includes('/auditoria')) return [];
    return { docenteId: 'docente-1', idRund: 'RUND-PRUEBA', proteccion_datos: { acceso_completo: true }, bloques: profileBlocks };
  });
  vi.mocked(apiClient.upload).mockResolvedValue({ id: 'nuevo' });
  vi.mocked(apiClient.post).mockResolvedValue({ success: true });
  vi.mocked(apiClient.delete).mockResolvedValue({ success: true });
});
afterEach(() => cleanup());

const abrirFormacion = async () => {
  render(<RundValidationPanel docenteId="docente-1" />);
  await screen.findByText('RUND-PRUEBA');
  fireEvent.click(screen.getByRole('tab', { name: /01 Títulos de formación/ }));
  return screen.findByRole('region', { name: 'Soportes documentales según codificación' });
};

describe('Soportes de títulos en la ficha RUND: tabla y formulario del título', () => {
  it('cada título registrado (precargado y adicionales) es una fila de la tabla', async () => {
    const tabla = within(await abrirFormacion());
    for (const titulo of ['Abogado', 'Contador Público', 'Economista']) expect(tabla.getByText(titulo)).toBeTruthy();
    expect(tabla.getAllByRole('row').filter(fila => /^1\.1\.\d/.test(within(fila).queryAllByRole('cell')[0]?.textContent || ''))).toHaveLength(3);
  });

  it('cargar en una fila que ya tiene título sube el archivo directo, sin enviar título', async () => {
    const tabla = within(await abrirFormacion());
    const input = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (this: HTMLInputElement) {
      Object.defineProperty(this, 'files', { value: [pdf()], configurable: true });
      this.onchange?.(new Event('change') as any);
    });
    fireEvent.click(tabla.getByRole('button', { name: /Cargar Pregrado 1\.1\.1/ }));
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalledTimes(1));
    const form = vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(form.get('tipoSoporte')).toBe('diploma_pregrado');
    expect(form.get('modo')).toBe('agregar');
    expect(form.get('titulo')).toBeNull();
    input.mockRestore();
  });

  it('cargar un nivel sin título abre el formulario y envía título y PDF juntos aunque el perfil no tenga el dato', async () => {
    const tabla = within(await abrirFormacion());
    // Maestría no tiene título registrado: antes mostraba «Sin dato» y bloqueaba la carga.
    expect(within(tabla.getByRole('row', { name: /1\.3\.1/ })).queryByText('Sin dato')).toBeNull();
    fireEvent.click(tabla.getByRole('button', { name: /Cargar Maestría 1\.3\.1/ }));
    const dialogo = within(screen.getByRole('dialog', { name: /Cargar maestría/ }));
    fireEvent.change(dialogo.getByLabelText(/Título de maestría/), { target: { value: '  Maestría en Gobierno  ' } });
    fireEvent.change(dialogo.getByLabelText(/Documento \(PDF/), { target: { files: [pdf()] } });
    fireEvent.click(dialogo.getByRole('button', { name: 'Cargar documento' }));
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalledTimes(1));
    const [url, form] = vi.mocked(apiClient.upload).mock.calls[0] as [string, FormData];
    expect(url).toBe('/pta/api/v1/pta/banco-docentes/docente-1/bloques/FORMACION/soportes');
    expect(form.get('tipoSoporte')).toBe('diploma_maestria');
    expect(form.get('titulo')).toBe('Maestría en Gobierno');
    expect(form.get('modo')).toBe('agregar');
    expect((form.get('file') as File).name).toBe('diploma.pdf');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('un soporte que no es título y no tiene dato no se puede cargar y no se envía nada', async () => {
    const tabla = within(await abrirFormacion());
    // El perfil académico no tiene dato: la fila sigue bloqueada, solo los diplomas de nivel piden el título al cargar.
    const fila = within(tabla.getByRole('row', { name: /Perfil académico/ }));
    expect(fila.getByText('Sin dato')).toBeTruthy();
    expect(fila.queryByRole('button', { name: /Cargar/ })).toBeNull();
    expect(apiClient.upload).not.toHaveBeenCalled();
  });

  it('«Agregar otro pregrado» solo aparece cuando todos los títulos tienen archivo', async () => {
    soportes = [
      { id: 's1', tipo_soporte: 'diploma_pregrado', documento_perfil_id: 'd1', documento_carpeta_id: '/1', nombre_archivo: 'a.pdf', estado: 'Pendiente', estado_documento: 'ACTIVO' },
      { id: 's2', tipo_soporte: 'diploma_pregrado', documento_perfil_id: 'd2', documento_carpeta_id: '/2', nombre_archivo: 'b.pdf', estado: 'Pendiente', estado_documento: 'ACTIVO' },
    ];
    const tabla = within(await abrirFormacion());
    // 3 títulos y 2 archivos: falta cargar el tercero desde su fila.
    expect(tabla.queryByRole('button', { name: 'Agregar otro pregrado' })).toBeNull();
    expect(tabla.getByRole('button', { name: /Cargar Pregrado adicional 1\.1\.3/ })).toBeTruthy();
    soportes.push({ id: 's3', tipo_soporte: 'diploma_pregrado', documento_perfil_id: 'd3', documento_carpeta_id: '/3', nombre_archivo: 'c.pdf', estado: 'Pendiente', estado_documento: 'ACTIVO' });
    cleanup();
    const nueva = within(await abrirFormacion());
    expect(nueva.getByRole('button', { name: 'Agregar otro pregrado' })).toBeTruthy();
  });

  describe('editar y eliminar la fila de un título', () => {
    const URL_TITULOS = '/pta/api/v1/pta/banco-docentes/docente-1/titulos-formacion';
    const archivo = (id: string, documento: string | null) => ({ id, tipo_soporte: 'diploma_pregrado', documento_perfil_id: documento, documento_carpeta_id: `/${id}`, nombre_archivo: `${id}.pdf`, estado: 'Pendiente', estado_documento: 'ACTIVO' });
    let confirmar: { mockReturnValue: (valor: boolean) => unknown; mockRestore: () => void };
    beforeEach(() => { confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true); });
    afterEach(() => confirmar.mockRestore());

    it('Editar envía el título anterior y el nuevo al servidor y recarga la ficha', async () => {
      const tabla = within(await abrirFormacion());
      const llamadasGet = vi.mocked(apiClient.get).mock.calls.length;
      fireEvent.click(tabla.getByRole('button', { name: /Editar título Pregrado adicional 1\.1\.2/ }));
      fireEvent.change(screen.getByLabelText(/Título de pregrado/), { target: { value: 'Contaduría Pública' } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(`${URL_TITULOS}/editar`, { tipoSoporte: 'diploma_pregrado', titulo: 'Contador Público', nuevoTitulo: 'Contaduría Pública' }));
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Título actualizado.'));
      await waitFor(() => expect(vi.mocked(apiClient.get).mock.calls.length).toBeGreaterThan(llamadasGet));
    });

    it('si el servidor rechaza el cambio (por ejemplo, título repetido) muestra su mensaje y no sube archivos', async () => {
      vi.mocked(apiClient.post).mockRejectedValueOnce(new Error('Ya existe un título con ese nombre en este nivel.'));
      const tabla = within(await abrirFormacion());
      fireEvent.click(tabla.getByRole('button', { name: /Editar título Pregrado 1\.1\.1/ }));
      fireEvent.change(screen.getByLabelText(/Título de pregrado/), { target: { value: 'Economista' } });
      fireEvent.change(screen.getByLabelText(/Adjuntar documento/), { target: { files: [pdf()] } });
      fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Ya existe un título con ese nombre en este nivel.'));
      expect(apiClient.upload).not.toHaveBeenCalled();
    });

    it('Eliminar una fila con archivo retira primero el documento y luego el título', async () => {
      soportes = [archivo('a', 'd1'), archivo('b', 'd2')];
      const tabla = within(await abrirFormacion());
      fireEvent.click(tabla.getByRole('button', { name: /Eliminar título Pregrado adicional 1\.1\.2/ }));
      expect(confirmar).toHaveBeenCalledWith(expect.stringContaining('Contador Público'));
      await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(`${URL_TITULOS}/eliminar`, { tipoSoporte: 'diploma_pregrado', titulo: 'Contador Público' }));
      expect(apiClient.delete).toHaveBeenCalledWith('/pta/api/v1/pta/banco-docentes/docente-1/documentos/d2');
      expect(vi.mocked(apiClient.delete).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(apiClient.post).mock.invocationCallOrder[0]);
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Título eliminado.'));
    });

    it('Eliminar un título sin archivo solo quita el título', async () => {
      const tabla = within(await abrirFormacion());
      fireEvent.click(tabla.getByRole('button', { name: /Eliminar título Pregrado adicional 1\.1\.3/ }));
      await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(`${URL_TITULOS}/eliminar`, { tipoSoporte: 'diploma_pregrado', titulo: 'Economista' }));
      expect(apiClient.delete).not.toHaveBeenCalled();
    });

    it('si el usuario cancela la confirmación no se borra nada', async () => {
      confirmar.mockReturnValue(false);
      const tabla = within(await abrirFormacion());
      fireEvent.click(tabla.getByRole('button', { name: /Eliminar título Pregrado 1\.1\.1/ }));
      expect(apiClient.post).not.toHaveBeenCalled();
      expect(apiClient.delete).not.toHaveBeenCalled();
    });

    it('un archivo histórico (sin versión documental) no se elimina y no toca el título', async () => {
      soportes = [archivo('historico', null)];
      const tabla = within(await abrirFormacion());
      fireEvent.click(tabla.getByRole('button', { name: /Eliminar título Pregrado 1\.1\.1/ }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('soporte histórico')));
      expect(apiClient.delete).not.toHaveBeenCalled();
      expect(apiClient.post).not.toHaveBeenCalled();
    });

    it('si falla el borrado del documento no se quita el título', async () => {
      soportes = [archivo('a', 'd1')];
      vi.mocked(apiClient.delete).mockRejectedValueOnce(new Error('No se pudo eliminar el archivo.'));
      const tabla = within(await abrirFormacion());
      fireEvent.click(tabla.getByRole('button', { name: /Eliminar título Pregrado 1\.1\.1/ }));
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No se pudo eliminar el archivo.'));
      expect(apiClient.post).not.toHaveBeenCalled();
    });
  });
});
