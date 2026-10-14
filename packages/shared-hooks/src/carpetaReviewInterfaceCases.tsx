import React from 'react';

/** Pruebas de las secciones reales; el panel se sustituye solo para accionar sus callbacks. */
export function runCarpetaReviewInterfaceCases(k: any) {
  const { describe, it, expect, beforeEach, afterEach, vi, render, screen, fireEvent, waitFor, cleanup, Component, docs } = k;
  const revision = 'a'.repeat(64), id = '22222222-2222-4222-8222-222222222222';
  const person = '11111111-1111-4111-8111-111111111111', tipo = '33333333-3333-4333-8333-333333333333';
  let listed: any[];
  beforeEach(() => {
    vi.clearAllMocks();
    listed = [{ id, nombre: 'Original.pdf', estado: 'pendiente', categoria: 'personal', servicio_propietario: 'auth',
      revision_documento: revision, requiere_revision_documento: true, url_archivo: '/auth/original.pdf' }];
    docs.getDocumentosByCarpeta.mockImplementation(async () => ({ success: true, data: listed }));
    docs.getCarpetaByPersona.mockResolvedValue({ success: true, data: { persona_id: person, carpeta_digital_id: 'folder' } });
    docs.getChecklistForPersona.mockResolvedValue({ success: true, data: { carpeta: {}, useGlobalTypes: false,
      tiposDocumentos: [{ id: tipo, nombre: 'Local requisito', categoria: 'academico', activo: true }] } });
    docs.validarDocumento.mockResolvedValue({ success: true }); docs.rechazarDocumento.mockResolvedValue({ success: true });
    docs.delete.mockResolvedValue({ success: true }); docs.getDownloadUrl.mockResolvedValue({ success: false, error: 'Original no disponible' });
    docs.reclassify.mockResolvedValue({ success: true });
  });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  const mount = () => render(<Component initialUserId={person} onBack={() => {}} users={[{ id: person, firstName: 'Persona', lastName: 'Ficticia', email: 'persona@example.test' }]} />);
  describe('la revisión vista atraviesa la sección y sus acciones reales', () => {
    it('aprobar/rechazar/retirar/descargar conservan la revisión del documento mostrado', async () => {
      vi.spyOn(window, 'prompt').mockReturnValue('Revisar'); mount();
      await screen.findByText('Documento listo');
      fireEvent.click(screen.getByRole('button', { name: 'Aprobar muestra' }));
      await waitFor(() => expect(docs.validarDocumento).toHaveBeenCalledWith(id, undefined, revision));
      fireEvent.click(screen.getByRole('button', { name: 'Rechazar muestra' }));
      await waitFor(() => expect(docs.rechazarDocumento).toHaveBeenCalledWith(id, undefined, 'Revisar', revision));
      fireEvent.click(screen.getByRole('button', { name: 'Descargar muestra' }));
      await waitFor(() => expect(docs.getDownloadUrl).toHaveBeenCalledWith(id, revision));
      fireEvent.click(screen.getByRole('button', { name: 'Retirar muestra' }));
      await waitFor(() => expect(docs.delete).toHaveBeenCalledWith(id, revision));
    });
    it('reclasificar conserva la revisión vista en el modal', async () => {
      mount(); await screen.findByText('Documento listo');
      fireEvent.click(screen.getByRole('button', { name: 'Clasificar muestra' }));
      fireEvent.click(await screen.findByRole('button', { name: /Local requisito/ }));
      fireEvent.click(screen.getByRole('button', { name: 'Vincular a tipo' }));
      await waitFor(() => expect(docs.reclassify).toHaveBeenCalledWith(id, expect.objectContaining({ revision_documento: revision, tipo_documento_id: tipo, categoria: 'academico' })));
    });
    it('un local pendiente sin tipo no completa un requisito por coincidencia de nombre', async () => {
      listed = [{ id: 'local-documento:persona:local', nombre: 'Local requisito.pdf · pendiente de guardar', pendiente_de_guardar: true,
        categoria: 'academico', estado: 'pendiente', tipo_documento_id: null, url_archivo: null }];
      mount();
      await waitFor(() => expect(screen.getByTestId('requisitos').textContent).toBe('Local requisito:pendiente'));
    });
  });
}

export function ReviewPanelFixture(props: any) {
  const doc = props.documentos[0];
  return <div>
    {doc && <p>Documento listo</p>}
    <output data-testid="requisitos">{props.tiposDocumentos.map((t: any) => `${t.nombre}:${t.completado ? 'completo' : 'pendiente'}`).join(',')}</output>
    {doc && <>
      <button onClick={() => props.onValidate(doc)}>Aprobar muestra</button>
      <button onClick={() => props.onReject(doc)}>Rechazar muestra</button>
      <button onClick={() => props.onDownload(doc)}>Descargar muestra</button>
      <button onClick={() => props.onDelete(doc)}>Retirar muestra</button>
      <button onClick={() => props.onEditCategory(doc)}>Clasificar muestra</button>
    </>}
  </div>;
}
