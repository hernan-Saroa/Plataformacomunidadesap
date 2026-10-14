export function runCarpetaDocumentCases(k: any) {
  const { describe, it, expect, beforeEach, afterEach, vi, service } = k;
  const person = '11111111-1111-4111-8111-111111111111', id = '22222222-2222-4222-8222-222222222222';
  const base = '/auth/api/v1/carpeta-digital';
  const auth = { id, servicio_propietario: 'auth', persistido: true, estado: 'pendiente', nombre: 'Archivo.pdf', url_archivo: '/auth/api/v1/uploads/carpeta-digital/person/archivo.pdf', versionado_disponible: false };
  const rund = { ...auth, id: `rund-service:documento:${id}`, servicio_propietario: 'rund', rund_docente_id: 'DOC-1',
    rund_documento_id: id, documento_logico_id: 'logical-1', version_actual: 2, versionado_disponible: true };
  const authRows = [
    { id: 'auth-old', documento_id: id, numero_version: 1, es_version_actual: false, fecha_creacion: '2026-10-01T00:00:00Z' },
    { id: 'auth-current', documento_id: id, numero_version: 2, es_version_actual: true },
  ];
  let fetchMock: any, current: any, reject: string, status: number;
  beforeEach(() => {
    current = auth; reject = ''; status = 200;
    localStorage.clear(); localStorage.setItem('esap-carpeta-digital-docs', JSON.stringify({ [person]: [{ id: 'local-1', nombre: 'Local.pdf', estado: 'validado', tipo_documento_id: 'tipo-1', url_archivo: 'blob:anterior', version_actual: 8 }] }));
    fetchMock = vi.fn(async (url: string, o: any) => {
      const p = new URL(url).pathname.replace(/^\/services/, '');
      const result = (data: any) => new Response(JSON.stringify({ success: true, data }));
      if (reject && p.includes(reject)) return new Response(JSON.stringify({ success: false, error: 'Error', message: 'Rechazo ficticio' }), { status });
      if (p.endsWith('/checklist')) return result({ tiposDocumentos: [{ id: 'tipo-1' }], carpeta: { persona_id: person } });
      if (p.endsWith('/versiones')) {
        if (o.method === 'POST') return result({ documento_id: id, persistido: true, version_actual: 3, estado: 'pendiente',
          version: { id: 'auth-new', documento_id: id, numero_version: 3 } });
        return result({ documento_id: id, version_actual: 2, versiones: authRows, permite_restaurar: true });
      }
      if (p.endsWith('/restaurar')) return result({ documento_id: id, persistido: true, version_actual: 3, estado: 'pendiente',
        version: { id: 'auth-new', documento_id: id, numero_version: 3, restaurada_desde_version: 1 } });
      if (p.endsWith('/documentos') && p.startsWith('/rund/')) return result([
        { id: 'old-version', documentoLogicoId: 'logical-1', version: 1, nombreArchivo: 'Antes.pdf', creadoEn: '2026-10-01T00:00:00Z', contenidoUrl: '/rund/api/v1/old/contenido' },
        { id, documentoLogicoId: 'logical-1', version: 2, nombreArchivo: 'Actual.pdf' },
        { id: 'foreign-version', documentoLogicoId: 'foreign', version: 9 },
      ]);
      if (p.endsWith('/documentos')) return result([current]);
      if (p.includes('/persona/') && !p.includes('/documentos')) return result({ persona_id: person, total_documentos: 1, permite_originales_rund: false });
      if (p.endsWith('/upload')) return result(auth);
      if (p.endsWith('/validate')) return result({ ...auth, estado: JSON.parse(o.body).estado });
      if (p.endsWith('/reclassify')) return result(auth);
      if (p.endsWith('/reemplazo')) return result({ id: 'new-version', documentoLogicoId: 'logical-1', version: 3 });
      if (o.method === 'DELETE') return result({ id, eliminado: true });
      if (p.includes('/uploads/') || p.endsWith('/contenido')) return new Response('PDF FICTICIO');
      return result(current);
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('URL', class extends URL { static createObjectURL() { return 'blob:ficticio'; } static revokeObjectURL() {} });
    vi.useFakeTimers();
  });
  afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); localStorage.clear(); });
  describe('consumidor persistente y versiones según propietario', () => {
    it('lista desde el servidor, preserva storage y marca registros locales pendientes', async () => {
      const before = localStorage.getItem('esap-carpeta-digital-docs');
      const res = await service.getDocumentosByCarpeta(`carpeta:${person}`);
      expect(res.success).toBe(true); expect(res.data[0].id).toBe(id);
      expect(res.data[1]).toMatchObject({ pendiente_de_guardar: true, estado: 'pendiente', version_actual: null, url_archivo: null });
      expect(res.data[1].nombre).toContain('pendiente de guardar');
      expect(localStorage.getItem('esap-carpeta-digital-docs')).toBe(before);
      expect(fetchMock.mock.calls.every((c: any) => c[1].credentials === 'include')).toBe(true);
    });
    it('usa la persona canónica del servidor cuando el selector entrega ID de usuario', async () => {
      await service.getDocumentosByCarpeta('carpeta:public-user');
      expect(fetchMock.mock.calls[1][0]).toContain(`/persona/${person}/documentos`);
    });
    it('la fila protegida del servidor prevalece sobre una copia local', async () => {
      localStorage.setItem('esap-carpeta-digital-docs', JSON.stringify({ [person]: [{ id, nombre: 'Sensible.pdf' }] }));
      current = { ...auth, nombre: 'Protegido', url_archivo: null, contenido_restringido: true };
      const res = await service.getDocumentosByCarpeta(person); expect(res.data).toHaveLength(1); expect(res.data[0].nombre).toBe('Protegido');
    });
    it('protege datos RUND locales de otra sesión', async () => {
      localStorage.setItem('esap-carpeta-digital-docs', JSON.stringify({ [person]: [{ id: 'local-1', categoria: 'RUND', nombre: 'Sensible.pdf', comentarios: 'Salario' }] }));
      const res = await service.getDocumentosByCarpeta(person); expect(res.data[1].nombre).not.toContain('Sensible'); expect(res.data[1].comentarios).toBeNull();
    });
    it('una copia local no completa requisitos de documentos guardados', async () => {
      expect((await service.getChecklistForPersona(person)).data.tiposDocumentos[0].completado).toBe(false);
    });
    it.each([403, 503])('listado HTTP %s no cae a datos locales exitosos', async (code: number) => {
      reject = '/documentos'; status = code; expect((await service.getDocumentosByCarpeta(person)).success).toBe(false);
    });
    it('sube FormData a auth sin crear otro registro local', async () => {
      const before = localStorage.getItem('esap-carpeta-digital-docs');
      expect((await service.uploadFile(new File(['PDF'], 'Archivo.pdf'), 'public-user', 'personal', { tipo_documento_id: 'tipo-1' })).success).toBe(true);
      const call = fetchMock.mock.calls.find((c: any) => c[1].method === 'POST');
      expect(call[0]).toContain(`/persona/${person}/documentos/upload`); expect(call[1].body).toBeInstanceOf(FormData);
      expect(call[1].body.get('tipoDocumentoId')).toBe('tipo-1'); expect(call[1].credentials).toBe('include');
      expect(call[1].headers).not.toHaveProperty('Content-Type'); expect(localStorage.getItem('esap-carpeta-digital-docs')).toBe(before);
    });
    it.each([200, 503])('subida rechazada HTTP %s no devuelve guardado exitoso ni se repite', async (code: number) => {
      reject = '/upload'; status = code;
      expect((await service.uploadFile(new File(['PDF'], 'Archivo.pdf'), person)).success).toBe(false);
      expect(fetchMock.mock.calls.filter((c: any) => c[1].method === 'POST')).toHaveLength(1);
    });
    it('valida en auth sin inventar actor o sincronizar una caché local a RUND', async () => {
      expect((await service.validarDocumento(id, 'SUPLANTADO')).success).toBe(true);
      const call = fetchMock.mock.calls.find((c: any) => c[1].method === 'PUT');
      expect(call[0]).toContain('/validate'); expect(JSON.parse(call[1].body)).toEqual({ estado: 'validado' });
      expect(fetchMock.mock.calls.some((c: any) => c[0].includes('sync-documents'))).toBe(false);
    });
    it('rechazo documental conserva el motivo', async () => {
      expect((await service.rechazarDocumento(id, 'Administrador', 'Revisar')).success).toBe(true);
      expect(JSON.parse(fetchMock.mock.calls.find((c: any) => c[1].method === 'PUT')[1].body)).toEqual({ estado: 'rechazado', comentarios: 'Revisar' });
    });
    it('validar y rechazar mandan la revisión que vio el usuario, sin declarar un actor', async () => {
      const revision = 'a'.repeat(64); current = { ...auth, revision_documento: revision, requiere_revision_documento: true };
      expect((await service.validarDocumento(id, 'ACTOR_FALSO', revision)).success).toBe(true);
      expect((await service.rechazarDocumento(id, 'ACTOR_FALSO', 'Revisar', revision)).success).toBe(true);
      const puts = fetchMock.mock.calls.filter((c: any) => c[1].method === 'PUT');
      expect(JSON.parse(puts[0][1].body)).toEqual({ estado: 'validado', revision_documento: revision });
      expect(JSON.parse(puts[1][1].body)).toEqual({ estado: 'rechazado', comentarios: 'Revisar', revision_documento: revision });
    });
    it('una revisión vista antigua impide validar, rechazar, reclasificar y retirar sin enviar mutaciones', async () => {
      current = { ...auth, revision_documento: 'b'.repeat(64), requiere_revision_documento: true };
      const revision = 'a'.repeat(64);
      for (const res of await Promise.all([service.validarDocumento(id, undefined, revision), service.rechazarDocumento(id, undefined, 'Revisar', revision),
        service.reclassify(id, { categoria: 'academico', revision_documento: revision }), service.delete(id, revision)])) expect(res.success).toBe(false);
      expect(fetchMock.mock.calls.every((c: any) => c[1].method === 'GET')).toBe(true);
    });
    it('si Auth requiere revisión, un cliente sin la revisión vista no usa la recién consultada como sustituto', async () => {
      current = { ...auth, revision_documento: 'b'.repeat(64), requiere_revision_documento: true };
      for (const res of await Promise.all([service.validarDocumento(id), service.rechazarDocumento(id), service.reclassify(id, {}), service.delete(id)])) expect(res.success).toBe(false);
      expect(fetchMock.mock.calls.every((c: any) => c[1].method === 'GET')).toBe(true);
    });
    it('reclasificación y retiro envían la revisión vista por los endpoints de Auth', async () => {
      const revision = 'a'.repeat(64); current = { ...auth, revision_documento: revision, requiere_revision_documento: true };
      expect((await service.reclassify(id, { categoria: 'laboral', revision_documento: revision })).success).toBe(true);
      expect((await service.delete(id, revision)).success).toBe(true);
      expect(JSON.parse(fetchMock.mock.calls.find((c: any) => c[1].method === 'PUT')[1].body)).toEqual({ categoria: 'laboral', revision_documento: revision });
      const call = fetchMock.mock.calls.find((c: any) => c[1].method === 'DELETE'); expect(new URL(call[0]).searchParams.get('revision_documento')).toBe(revision);
    });
    it('un original que cambió desde la vista no se descarga como si fuera el que revisó el usuario', async () => {
      current = { ...auth, revision_documento: 'b'.repeat(64) };
      expect((await service.getDownloadUrl(id, 'a'.repeat(64))).success).toBe(false); expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    it('409 después de consultar metadatos no reintenta la validación ni modifica storage', async () => {
      const revision = 'a'.repeat(64); current = { ...auth, revision_documento: revision, requiere_revision_documento: true };
      reject = '/validate'; status = 409; const before = localStorage.getItem('esap-carpeta-digital-docs');
      expect((await service.validarDocumento(id, undefined, revision)).success).toBe(false);
      expect(fetchMock.mock.calls.filter((c: any) => c[1].method === 'PUT')).toHaveLength(1);
      expect(localStorage.getItem('esap-carpeta-digital-docs')).toBe(before);
    });
    it.each([403, 503])('mutación HTTP %s preserva storage y comunica el rechazo', async (code: number) => {
      reject = '/validate'; status = code; const before = localStorage.getItem('esap-carpeta-digital-docs');
      expect((await service.validarDocumento(id)).success).toBe(false); expect(localStorage.getItem('esap-carpeta-digital-docs')).toBe(before);
    });
    it('reclasificación y retiro de auth esperan confirmación del propietario', async () => {
      expect((await service.reclassify(id, { categoria: 'academico' })).success).toBe(true);
      expect((await service.delete(id)).success).toBe(true);
      expect(fetchMock.mock.calls.find((c: any) => c[1].method === 'DELETE')[0]).toContain(`/auth/api/v1/carpeta-digital/documentos/${id}`);
    });
    it('original restringido no solicita los bytes', async () => {
      current = { ...rund, contenido_restringido: true, url_archivo: null };
      expect((await service.getDownloadUrl(rund.id)).success).toBe(false); expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    it('original disponible se descarga con cookies y devuelve blob temporal', async () => {
      expect((await service.getDownloadUrl(id)).data.url).toBe('blob:ficticio'); expect(fetchMock.mock.calls[1][1].credentials).toBe('include');
    });
    it('historial RUND conserva IDs/fechas reales y excluye versiones ajenas', async () => {
      current = rund; const res = await service.getVersiones(rund.id);
      expect(res.data.versiones.map((v: any) => v.id)).toEqual(['old-version', id]);
      expect(res.data.versiones[0].fecha_creacion).toBe('2026-10-01T00:00:00Z');
    });
    it('historial Auth conserva el documento y los IDs reales del servidor', async () => {
      current = { ...auth, versionado_disponible: true };
      const res = await service.getVersiones(id);
      expect(res.success).toBe(true); expect(res.data.version_actual).toBe(2);
      expect(res.data.versiones.map((v: any) => v.id)).toEqual(['auth-old', 'auth-current']);
      expect(res.data.versiones[0].fecha_creacion).toBe('2026-10-01T00:00:00Z');
    });
    it('descarga Auth comprueba pertenencia y usa el endpoint de bytes de la versión elegida', async () => {
      current = { ...auth, versionado_disponible: true };
      expect((await service.downloadVersion(id, 'auth-old')).success).toBe(true);
      expect(fetchMock.mock.calls[2][0]).toContain(`/documentos/${id}/versiones/auth-old/contenido`);
      expect(fetchMock.mock.calls[2][1].credentials).toBe('include');
      fetchMock.mockClear(); expect((await service.downloadVersion(id, 'ajena')).success).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    it('reemplazo Auth manda bytes y la versión actual como precondición, conservando storage', async () => {
      current = { ...auth, versionado_disponible: true };
      const before = localStorage.getItem('esap-carpeta-digital-docs');
      expect((await service.crearNuevaVersion(id, new File(['PDF'], 'Nuevo.pdf'), 'Cambio')).success).toBe(true);
      const call = fetchMock.mock.calls.find((c: any) => c[1].method === 'POST');
      expect(call[0]).toContain(`/documentos/${id}/versiones`); expect(call[1].body.get('version_actual')).toBe('2');
      expect(call[1].body.get('comentarios')).toBe('Cambio'); expect(call[1].body.get('file').name).toBe('Nuevo.pdf');
      expect(localStorage.getItem('esap-carpeta-digital-docs')).toBe(before);
    });
    it('restauración Auth confirma una nueva versión vinculada a la elegida', async () => {
      current = { ...auth, versionado_disponible: true };
      expect((await service.restaurarVersion(id, 'auth-old', 'Restaurar')).success).toBe(true);
      const call = fetchMock.mock.calls.find((c: any) => c[1].method === 'POST');
      expect(call[0]).toContain('/auth-old/restaurar'); expect(JSON.parse(call[1].body)).toEqual({ version_actual: 2, comentarios: 'Restaurar' });
    });
    it.each(['auth-current', 'ajena'])('no restaura la versión Auth no elegible %s', async (version: string) => {
      current = { ...auth, versionado_disponible: true };
      expect((await service.restaurarVersion(id, version)).success).toBe(false);
      expect(fetchMock.mock.calls.every((c: any) => c[1].method === 'GET')).toBe(true);
    });
    it('conflicto de otra sesión al versionar no se reintenta ni anuncia éxito', async () => {
      current = { ...auth, versionado_disponible: true }; reject = '/versiones'; status = 409;
      expect((await service.crearNuevaVersion(id, new File(['PDF'], 'Nuevo.pdf'))).success).toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    it('descarga la versión elegida, nunca la actual o una versión ajena como sustituto', async () => {
      current = rund; expect((await service.downloadVersion(rund.id, 'old-version')).success).toBe(true);
      expect(fetchMock.mock.calls[2][0]).toContain('/old/contenido'); expect((await service.downloadVersion(rund.id, 'foreign-version')).success).toBe(false);
    });
    it('reemplazo y retiro RUND usan su propietario y versiones confirmadas', async () => {
      current = rund; expect((await service.crearNuevaVersion(rund.id, new File(['PDF'], 'Nuevo.pdf'))).success).toBe(true);
      expect((await service.delete(rund.id)).success).toBe(true);
      expect(fetchMock.mock.calls.find((c: any) => c[1].method === 'POST')[0]).toContain('/rund/api/v1/pta/banco-docentes/');
      expect(fetchMock.mock.calls.find((c: any) => c[1].method === 'DELETE')[0]).toContain('/rund/api/v1/pta/banco-docentes/');
    });
    it('validar y reclasificar RUND no mutan auth', async () => {
      current = rund; expect((await service.validarDocumento(rund.id)).success).toBe(false);
      expect((await service.reclassify(rund.id, {})).success).toBe(false); expect(fetchMock.mock.calls.every((c: any) => c[1].method === 'GET')).toBe(true);
    });
    it('registro local no se valida/elimina/versiona como si estuviera persistido', async () => {
      const local = `local-documento:${person}:local-1`;
      for (const res of await Promise.all([service.validarDocumento(local), service.delete(local), service.getVersiones(local)])) expect(res.success).toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });
    it('operaciones no disponibles no fabrican éxito ni eliminan los registros existentes', async () => {
      const before = localStorage.getItem('esap-carpeta-digital-docs');
      for (const res of await Promise.all([service.restaurarVersion(id, 'old'), service.actualizarEtiquetaVersion(id, 'old', 'FINAL'), service.eliminarVersion(id, 'old'), service.eliminarTodosLosDocumentos(), service.getVersiones(id)])) expect(res.success).toBe(false);
      expect(localStorage.getItem('esap-carpeta-digital-docs')).toBe(before);
    });
  });
}
