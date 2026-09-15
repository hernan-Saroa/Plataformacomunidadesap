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
let profileBlocks: Record<string, any>;
beforeEach(() => {
  vi.clearAllMocks();
  profileBlocks = {};
  blocks = ['IDENTIDAD', 'CONTACTO', 'FORMACION', 'VINCULACION', 'ACADEMICO', 'TRANSVERSAL'].map(bloque => ({ bloque, estado: 'Soporte faltante', soportes: [] }));
  blocks[0] = { bloque: 'IDENTIDAD', estado: 'En revisión', soportes: [{ id: 'soporte-1', tipo_soporte: 'documento_identidad', documento_perfil_id: 'version-1', documento_carpeta_id: '/pta/documento-1', nombre_archivo: 'identidad.pdf', estado: 'Pendiente' }] };
  vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
    if (url.includes('/bloques')) return JSON.parse(JSON.stringify(blocks));
    if (url.includes('/auditoria')) return [{ id: 'log-1', accion: 'CARGAR_DOCUMENTO', bloque: 'IDENTIDAD', actorId: 'CARGADOR', createdAt: '2026-09-08T12:00:00Z', metadata: { version: 1, nombreArchivo: 'identidad.pdf' } }];
    return { docenteId: 'docente-1', idRund: 'RUND-PRUEBA', proteccion_datos: { acceso_completo: true }, bloques: profileBlocks };
  });
  vi.mocked(apiClient.post).mockImplementation(async (url: string, body: any) => {
    if (url.endsWith('/revision')) {
      const block = blocks.find(b => url.includes(`/bloques/${b.bloque}/`));
      const support = block.soportes.find((s: any) => url.includes(`/soportes/${s.id}/`));
      support.revisiones_campos = { ...support.revisiones_campos, [body.campo]: { estado: body.estado, observacion: body.observacion, documentoVersionId: body.documentoVersionId } };
      const decisions = Object.values(support.revisiones_campos) as any[];
      support.estado = decisions.some(d => d.estado === 'Rechazado') ? 'Rechazado' : decisions.length === (block.bloque === 'IDENTIDAD' ? 5 : 2) ? 'Aprobado' : 'Pendiente';
      blocks[0].estado = body.estado === 'Rechazado' ? 'Devuelto' : 'En revisión';
    } else if (url.endsWith('/aprobar')) {
      blocks[0].estado = 'Aprobado';
      blocks[0].fecha_revision = '2026-09-08T12:00:00Z';
    }
    return { success: true };
  });
});
afterEach(cleanup);

async function approveRemainingRows() {
  await waitFor(() => expect(screen.getAllByRole('button', { name: 'Aprobar', exact: true })).toHaveLength(4));
  for (let remaining = 4; remaining > 0; remaining--) {
    const button = screen.getAllByRole('button', { name: 'Aprobar', exact: true })[0];
    await waitFor(() => expect((button as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(button);
    await waitFor(() => expect(screen.queryAllByRole('button', { name: 'Aprobar', exact: true })).toHaveLength(remaining - 1));
  }
}


describe('Revisión documental persistida en el panel RUND', () => {
  it('registra la decisión con la versión vigente y después aprueba el espacio', async () => {
    render(<RundValidationPanel docenteId="docente-1" />);
    const approve = (await screen.findAllByRole('button', { name: 'Aprobar', exact: true }))[0];
    expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(approve);
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/soportes/soporte-1/revision'), expect.objectContaining({ estado: 'Aprobado', campo: 'DOCUMENTO_IDENTIDAD', documentoVersionId: 'version-1' })));
    await approveRemainingRows();
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
    blocks[0].soportes[0].revisiones_campos = Object.fromEntries(['DOCUMENTO_IDENTIDAD', 'NOMBRE_COMPLETO', 'GENERO', 'SEXO_BIOLOGICO', 'FECHA_NACIMIENTO'].map(campo => [campo, { estado: 'Aprobado', documentoVersionId: 'version-1' }]));
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
    await approveRemainingRows();
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


describe('Independencia de filas que comparten un documento', () => {
  it.each([
    ['IDENTIDAD', 'documento_identidad', 'NOMBRE_COMPLETO', 5],
    ['VINCULACION', 'contrato', 'FECHAS_VINCULACION', 2],
    ['VINCULACION', 'acto_administrativo_dedicacion', 'HORAS_PTA', 2],
  ])('aprobar y devolver solo afecta la fila elegida: %s / %s', async (blockName, type, secondField, count) => {
    const block = blocks.find(b => b.bloque === blockName);
    block.soportes = [{ id: 'shared', tipo_soporte: type, estado: 'Pendiente', documento_perfil_id: 'v1', documento_carpeta_id: '/file' }];
    const view = render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('RUND-PRUEBA');
    if (blockName !== 'IDENTIDAD') fireEvent.click(screen.getByText('Vinculaci\u00f3n'));
    fireEvent.click((await screen.findAllByRole('button', { name: 'Aprobar', exact: true }))[1]);
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Aprobar', exact: true })).toHaveLength(Number(count) - 1));
    expect(apiClient.post).toHaveBeenCalledWith(expect.stringContaining('/shared/revision'), expect.objectContaining({ campo: secondField }));
    expect((screen.getByRole('button', { name: 'Aprobar bloque' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getAllByRole('button', { name: 'Devolver', exact: true })[0]);
    fireEvent.change(screen.getByLabelText('Motivo y correcci\u00f3n requerida'), { target: { value: 'Corregir solo esta fila.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar devoluci\u00f3n' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(await screen.findAllByText('Corregir solo esta fila.')).toHaveLength(1);
    expect(Object.values(block.soportes[0].revisiones_campos).map((d: any) => d.estado).sort()).toEqual(['Aprobado', 'Rechazado']);
    view.unmount();
    render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('RUND-PRUEBA');
    if (blockName !== 'IDENTIDAD') fireEvent.click(screen.getByText('Vinculaci\u00f3n'));
    expect(await screen.findByText('Corregir solo esta fila.')).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: 'Aprobar', exact: true })).toHaveLength(Number(count) - 2);
  });
});


describe('Carga por fila con datos', () => {
  it('no ofrece carga ni reemplazo sin datos, pero conserva la consulta del soporte', async () => {
    const view = render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('RUND-PRUEBA');
    expect(screen.getByRole('button', { name: 'Ver', exact: true })).toBeTruthy();
    expect(view.container.querySelectorAll('input[type="file"]')).toHaveLength(0);
    fireEvent.click(screen.getByText('Vinculaci\u00f3n'));
    expect(view.container.querySelectorAll('input[type="file"]')).toHaveLength(0);
    expect(screen.getAllByText('Sin dato para soportar').length).toBeGreaterThan(0);
    expect(apiClient.upload).not.toHaveBeenCalled();
  });

  it('ubica la carga compartida en la primera fila con datos y envia su identificador', async () => {
    blocks[0].soportes = [];
    profileBlocks = { IDENTIDAD: { campos: [{ campo: 'NOMBRE_COMPLETO', valor: 'PERSONA DE PRUEBA' }] } };
    const view = render(<RundValidationPanel docenteId="docente-1" />);
    await screen.findByText('PERSONA DE PRUEBA');
    const inputs = view.container.querySelectorAll('input[type="file"]');
    expect(inputs).toHaveLength(1);
    fireEvent.change(inputs[0], { target: { files: [new File(['%PDF-1.7'], 'identidad.pdf', { type: 'application/pdf' })] } });
    await waitFor(() => expect(apiClient.upload).toHaveBeenCalled());
    const form = vi.mocked(apiClient.upload).mock.calls[0][1] as FormData;
    expect(form.get('campo')).toBe('NOMBRE_COMPLETO');
    expect(form.get('tipoSoporte')).toBe('documento_identidad');
  });
});
