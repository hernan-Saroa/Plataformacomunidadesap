/** Adaptador documental compartido; el transporte y la sesión pertenecen a cada aplicación. */
type Result<T = any> = { success: boolean; data?: T; error?: string; [key: string]: any };
type Transport = {
  get<T = any>(path: string, params?: any, options?: any): Promise<T>;
  post<T = any>(path: string, data?: any, options?: any): Promise<T>;
  put<T = any>(path: string, data?: any, options?: any): Promise<T>;
  delete<T = any>(path: string, options?: any): Promise<T>;
  getBlob(path: string, params?: any, options?: any): Promise<Blob>;
};
const BASE = '/auth/api/v1/carpeta-digital';
const OPTIONS = { retries: 0, skipErrorToast: true, preserveResponse: true };
const key = (value: string) => decodeURIComponent(String(value || '')).replace(/^(carpeta|persona):/, '');
const localRund = (doc: any) => String(doc.categoria || '').toLowerCase() === 'rund'
  || ['rund', 'rund-service'].includes(String(doc.origen || '').toLowerCase()) || doc.rund_soporte_id || doc.rundSoporteId;

function payload(raw: any): any {
  let value = raw;
  for (let depth = 0; depth < 3; depth++) {
    if (value == null || value.success === false || value.exito === false) throw new Error(value?.message || 'El servidor no confirmó la operación.');
    if (typeof value !== 'object' || Array.isArray(value) || !Object.prototype.hasOwnProperty.call(value, 'data')) return value;
    value = value.data;
  }
  throw new Error('Respuesta documental no válida.');
}

export function createCarpetaDigitalDocuments(
  api: Transport,
  readLocal: () => Record<string, any[]>,
  getTipos: () => Promise<Result<any[]>>,
) {
  const attempt = async <T>(work: () => Promise<T>): Promise<Result<T>> => {
    try { return { success: true, data: await work() }; }
    catch (error: any) { return { success: false, error: error?.message || 'No se pudo completar la operación documental.' }; }
  };
  const pending = (id: string) => id.startsWith('local-documento:');
  const localMessage = 'Este archivo está pendiente de guardar. Vuelve a adjuntarlo para conservarlo en tu carpeta.';
  const unsupported = () => Promise.resolve<Result>({ success: false, error: 'Esta operación de versiones aún no está disponible. No se modificó el documento.' });

  async function folder(input: string) {
    const value = payload(await api.get(`${BASE}/persona/${encodeURIComponent(key(input))}`, undefined, OPTIONS));
    if (!value || typeof value.persona_id !== 'string' || !value.persona_id) throw new Error('No se pudo identificar la carpeta.');
    return value;
  }
  async function metadata(id: string) {
    if (pending(id)) throw new Error(localMessage);
    const value = payload(await api.get(`${BASE}/documentos/${encodeURIComponent(id)}`, undefined, OPTIONS));
    if (!value || value.id !== id) throw new Error('El servidor no confirmó el documento solicitado.');
    return value;
  }
  function requireAuth(doc: any) {
    if (doc.servicio_propietario !== 'auth') throw new Error('Gestiona este soporte desde su módulo propietario RUND o PTA.');
    if (doc.contenido_restringido) throw new Error('Tu sesión no permite modificar este documento.');
  }
  function reviewedRevision(doc: any, expected?: string) {
    if (expected !== undefined) {
      if (!/^[0-9a-f]{64}$/.test(expected) || doc.revision_documento !== expected) {
        throw new Error('El documento cambió. Actualiza la carpeta y revisa el original vigente antes de continuar.');
      }
      return expected;
    }
    if (doc.requiere_revision_documento) throw new Error('Actualiza la carpeta y revisa el original vigente antes de continuar.');
    // Clientes anteriores, solo mientras Auth anuncie que la revisión todavía es opcional.
    return typeof doc.revision_documento === 'string' ? doc.revision_documento : undefined;
  }
  function requireRund(doc: any) {
    if (doc.contenido_restringido) throw new Error('El original está restringido para tu sesión.');
    if (doc.servicio_propietario !== 'rund' || !doc.rund_documento_id || !doc.rund_docente_id || !doc.documento_logico_id) {
      throw new Error('Este soporte no tiene versiones disponibles en esta vista.');
    }
    return `/rund/api/v1/pta/banco-docentes/${encodeURIComponent(doc.rund_docente_id)}/documentos`;
  }
  async function nativeVersions(doc: any) {
    const path = requireRund(doc);
    const all = payload(await api.get(path, { historial: 'true' }, OPTIONS));
    if (!Array.isArray(all)) throw new Error('El servidor no confirmó el historial.');
    return all.filter(row => row.documentoLogicoId === doc.documento_logico_id);
  }
  async function authHistory(doc: any) {
    requireAuth(doc);
    if (!doc.versionado_disponible) throw new Error('El historial general está pendiente de habilitar en Auth.');
    const history = payload(await api.get(`${BASE}/documentos/${encodeURIComponent(doc.id)}/versiones`, undefined, OPTIONS));
    if (history?.documento_id !== doc.id || !Number.isInteger(history.version_actual) || history.version_actual < 1 || !Array.isArray(history.versiones)
      || history.versiones.some((row: any) => row.documento_id !== doc.id)) throw new Error('El servidor no confirmó el historial de este documento.');
    return history;
  }
  async function originalUrl(doc: any) {
    if (doc.contenido_restringido || !doc.url_archivo) throw new Error('No hay un original disponible para tu sesión.');
    // Los originales se descargan con la sesión actual; nunca se abren URLs del gateway como rutas del shell.
    const blob = await api.getBlob(doc.url_archivo, undefined, { retries: 0, skipErrorToast: true });
    const url = URL.createObjectURL(blob);
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    return { url };
  }
  async function reclassify(id: string, data: any) {
    return attempt(async () => {
      const doc = await metadata(id); requireAuth(doc);
      const revision = reviewedRevision(doc, data?.revision_documento);
      const saved = payload(await api.put(`${BASE}/documentos/${encodeURIComponent(id)}/reclassify`, { ...data, revision_documento: revision }, OPTIONS));
      if (saved?.id !== id) throw new Error('El servidor no confirmó la reclasificación.');
      return saved;
    });
  }
  async function validate(id: string, estado: string, comentarios?: string, expected?: string) {
    return attempt(async () => {
      const doc = await metadata(id); requireAuth(doc);
      const revision = reviewedRevision(doc, expected);
      const saved = payload(await api.put(`${BASE}/documentos/${encodeURIComponent(id)}/validate`, { estado, comentarios, revision_documento: revision }, OPTIONS));
      if (saved?.id !== id || saved.estado !== estado) throw new Error('El servidor no confirmó la validación.');
      return saved;
    });
  }
  const service = {
    getAllCarpetas: () => attempt(async () => {
      const data = payload(await api.get(BASE, undefined, OPTIONS));
      if (!Array.isArray(data)) throw new Error('El servidor no confirmó las carpetas.');
      return data;
    }),
    getCarpetaByPersona: (personaId: string) => attempt(() => folder(personaId)),
    getAll: () => Promise.resolve<Result<any[]>>({ success: false, error: 'Selecciona una carpeta para consultar sus documentos.' }),
    getDocumentosByCarpeta: (carpetaId: string) => attempt(async () => {
      const ownFolder = await folder(carpetaId);
      const docs = payload(await api.get(`${BASE}/persona/${encodeURIComponent(ownFolder.persona_id)}/documentos`, undefined, OPTIONS));
      if (!Array.isArray(docs)) throw new Error('El servidor no confirmó el listado documental.');
      const ids = new Set(docs.map(doc => doc.id));
      const local = readLocal();
      const drafts = [...new Set([key(carpetaId), ownFolder.persona_id])].flatMap(person =>
        (local[person] || []).filter(doc => !ids.has(doc.id)).map(doc => ({
          tipo_archivo: doc.tipo_archivo, tamano_bytes: doc.tamano_bytes, fecha_subida: doc.fecha_subida,
          tipo_documento_id: doc.tipo_documento_id,
          id: `local-documento:${encodeURIComponent(person)}:${encodeURIComponent(doc.id)}`,
          id_original_local: doc.id, servicio_propietario: 'local', pendiente_de_guardar: true,
          nombre: `${localRund(doc) && !ownFolder.permite_originales_rund
            ? 'Documento local del perfil' : doc.nombre || 'Archivo local'} · pendiente de guardar`,
          comentarios: localRund(doc) && !ownFolder.permite_originales_rund ? null : doc.comentarios,
          categoria: String(doc.categoria || 'otros').toLowerCase(), estado: 'pendiente', version_actual: null,
          versionado_disponible: false, url_archivo: null,
        })));
      return [...docs, ...drafts];
    }),
    getTiposDocumentos: () => getTipos(),
    getChecklistForPersona: (personaId: string) => attempt(async () => {
      const ownFolder = await folder(personaId);
      const result = payload(await api.get(`${BASE}/persona/${encodeURIComponent(ownFolder.persona_id)}/checklist`, undefined, OPTIONS));
      if (!Array.isArray(result?.tiposDocumentos)) throw new Error('El servidor no confirmó los requisitos documentales.');
      const listed = await service.getDocumentosByCarpeta(personaId);
      if (!listed.success) throw new Error(listed.error);
      const docs = (listed.data || []).filter(doc => !doc.pendiente_de_guardar);
      return { ...result, carpeta: ownFolder, useGlobalTypes: false, tiposDocumentos: result.tiposDocumentos.map((tipo: any) => {
        const doc = docs.find(doc => doc.tipo_documento_id === tipo.id);
        return { ...tipo, completado: !!doc, documento: doc || null };
      }) };
    }),
    uploadFile: (file: File, carpetaId: string, categoria = 'otros', fields?: Record<string, any>) => attempt(async () => {
      const ownFolder = await folder(carpetaId);
      const data = new FormData(); data.append('file', file);
      data.append('categoria', categoria);
      if (fields?.tipo_documento_id) data.append('tipoDocumentoId', fields.tipo_documento_id);
      const saved = payload(await api.post(`${BASE}/persona/${encodeURIComponent(ownFolder.persona_id)}/documentos/upload`, data, OPTIONS));
      if (!saved?.id || saved.servicio_propietario !== 'auth' || saved.persistido !== true || String(saved.url_archivo || '').startsWith('blob:')) {
        throw new Error('El servidor no confirmó que el archivo quedó guardado.');
      }
      return saved;
    }),
    update: (id: string, data: any) => reclassify(id, data),
    reclassify,
    updateDocumentCategory: (id: string, categoria: string, tipoDocumentoId?: string) => reclassify(id, { categoria, tipo_documento_id: tipoDocumentoId }),
    validarDocumento: (id: string, _actor?: string, revision?: string) => validate(id, 'validado', undefined, revision),
    rechazarDocumento: (id: string, _actor?: string, motivo?: string, revision?: string) => validate(id, 'rechazado', motivo, revision),
    delete: (id: string, expected?: string) => attempt(async () => {
      const doc = await metadata(id);
      if (doc.contenido_restringido) throw new Error('Tu sesión no permite retirar este documento.');
      let path: string;
      if (doc.servicio_propietario === 'rund') path = `${requireRund(doc)}/${encodeURIComponent(doc.rund_documento_id)}`;
      else {
        requireAuth(doc); const revision = reviewedRevision(doc, expected);
        path = `${BASE}/documentos/${encodeURIComponent(id)}${revision ? '?revision_documento=' + encodeURIComponent(revision) : ''}`;
      }
      const result = payload(await api.delete(path, OPTIONS));
      if (result?.id !== (doc.rund_documento_id || id)) throw new Error('El servidor no confirmó el retiro.');
      return result;
    }),
    getDownloadUrl: (id: string, expected?: string) => attempt(async () => {
      const doc = await metadata(id);
      if (doc.servicio_propietario === 'auth' && expected !== undefined) reviewedRevision(doc, expected);
      return originalUrl(doc);
    }),
    getVersiones: (id: string) => attempt(async () => {
      const doc = await metadata(id);
      if (doc.servicio_propietario === 'auth') return authHistory(doc);
      const rows = await nativeVersions(doc);
      return { version_actual: doc.version_actual, versiones: rows.map(row => ({
        id: row.id, documento_id: id, numero_version: row.version,
        nombre_archivo: row.nombreArchivo, tamano_bytes: row.tamanoBytes,
        fecha_creacion: row.creadoEn, creado_por: row.creadoPor,
        comentarios: row.descripcion || '', etiqueta: '' as const, tipo_archivo: 'pdf', nombre_archivo_storage: row.id,
        es_version_actual: row.id === doc.rund_documento_id,
      })), permite_restaurar: false, permite_etiquetar: false, permite_eliminar_version: false };
    }),
    downloadVersion: (id: string, versionId?: string) => attempt(async () => {
      const doc = await metadata(id);
      if (doc.servicio_propietario === 'auth') {
        const history = await authHistory(doc);
        if (!history.versiones.some((row: any) => row.id === versionId)) throw new Error('La versión no pertenece a este documento.');
        return originalUrl({ url_archivo: `${BASE}/documentos/${encodeURIComponent(id)}/versiones/${encodeURIComponent(versionId!)}/contenido` });
      }
      const rows = await nativeVersions(doc);
      const row = rows.find(row => row.id === versionId);
      if (!row?.contenidoUrl) throw new Error('Esta versión no está disponible para tu sesión.');
      return originalUrl({ url_archivo: row.contenidoUrl, contenido_restringido: row.contenidoRestringido });
    }),
    crearNuevaVersion: (id: string, file: File, comentarios?: string, etiqueta?: string) => attempt(async () => {
      const doc = await metadata(id);
      if (doc.servicio_propietario === 'auth') {
        const history = await authHistory(doc);
        if (etiqueta) throw new Error('Esta vista no admite etiquetas para versiones de Auth.');
        const data = new FormData(); data.append('file', file); data.append('version_actual', String(history.version_actual));
        if (comentarios) data.append('comentarios', comentarios);
        const saved = payload(await api.post(`${BASE}/documentos/${encodeURIComponent(id)}/versiones`, data, OPTIONS));
        if (saved?.documento_id !== id || saved.persistido !== true || saved.estado !== 'pendiente' || !saved.version?.id || saved.version_actual !== history.version_actual + 1
          || saved.version?.documento_id !== id || saved.version?.numero_version !== saved.version_actual) throw new Error('El servidor no confirmó la nueva versión.');
        return saved;
      }
      const path = requireRund(doc);
      if (etiqueta) throw new Error('Esta vista no admite etiquetas para versiones RUND.');
      const data = new FormData(); data.append('file', file);
      if (comentarios) data.append('descripcion', comentarios);
      const saved = payload(await api.post(`${path}/${encodeURIComponent(doc.rund_documento_id)}/reemplazo`, data, OPTIONS));
      if (!saved?.id || saved.id === doc.rund_documento_id || saved.documentoLogicoId !== doc.documento_logico_id
        || saved.version !== doc.version_actual + 1) throw new Error('El servidor no confirmó la nueva versión.');
      return saved;
    }),
    restaurarVersion: (id: string, versionId?: string, comentarios?: string) => attempt(async () => {
      const history = await authHistory(await metadata(id));
      const selected = history.versiones.find((row: any) => row.id === versionId);
      if (!selected || selected.es_version_actual || !history.permite_restaurar) throw new Error('No se puede restaurar esta versión.');
      const saved = payload(await api.post(`${BASE}/documentos/${encodeURIComponent(id)}/versiones/${encodeURIComponent(versionId!)}/restaurar`,
        { version_actual: history.version_actual, comentarios }, OPTIONS));
      if (saved?.documento_id !== id || saved.persistido !== true || saved.estado !== 'pendiente' || !saved.version?.id || saved.version?.documento_id !== id
        || saved.version?.numero_version !== saved.version_actual || saved.version_actual !== history.version_actual + 1
        || saved.version?.restaurada_desde_version !== selected.numero_version) throw new Error('El servidor no confirmó la restauración.');
      return saved;
    }),
    actualizarEtiquetaVersion: (_id: string, _versionId?: string, _etiqueta?: string) => unsupported(),
    eliminarVersion: (_id: string, _versionId?: string, _motivo?: string) => unsupported(),
    eliminarTodosLosDocumentos: () => Promise.resolve<Result>({ success: false, error: 'No hay una eliminación masiva disponible. Los documentos existentes se conservan.' }),
    downloadMultipleAsZip: (..._args: any[]) => Promise.resolve<Result>({ success: false, error: 'Selecciona los documentos disponibles de una carpeta para descargar.' }),
  };
  return service;
}
