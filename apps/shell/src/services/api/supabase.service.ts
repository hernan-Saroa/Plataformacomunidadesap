import { apiClient } from './apiClient';

type ServiceResult<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  [key: string]: any;
};

type UsersPageResponse = {
  data?: any[];
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    totalPages?: number;
  };
};

const USERS_ENDPOINT = '/auth/api/v1/users';
const CARPETAS_DIGITALES_ENDPOINT = '/auth/api/v1/carpeta-digital';
const TIPOS_DOCUMENTOS_ENDPOINT = '/auth/api/v1/tipos-documentos';
const USERS_PAGE_SIZE = 500;
const STORAGE_DOCS = 'esap-carpeta-digital-docs';
const STORAGE_TEMPLATES = 'esap-carpeta-digital-templates';

const DEFAULT_TEMPLATES = [
  {
    id: 'tpl-docente',
    nombre: 'Checklist Docente',
    descripcion: 'Documentos base para docentes y vinculacion academica.',
    color: '#003DA5',
    activo: true,
    tipos_documentos: [],
    items: [],
  },
];

function readStore<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStore<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable in restricted browsers; keep best-effort behavior.
  }
}

function getId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeCarpetaId(carpetaId: string): string {
  return decodeURIComponent(carpetaId || '').replace(/^carpeta:/, '').replace(/^persona:/, '');
}

function normalizeDocumentText(value: unknown): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function getPersonKey(person: any): string {
  return String(
    person?.id ||
    person?.personId ||
    person?.persona_id ||
    person?.public_id ||
    person?.user?.public_id ||
    person?.user?.id_user ||
    person?.documentNumber ||
    person?.identification_number ||
    person?.email ||
    ''
  );
}

function getPersonName(person: any): string {
  const firstName = person?.first_name || person?.firstName || '';
  const lastName = person?.last_name || person?.lastName || '';
  return String(
    person?.full_name ||
    person?.fullName ||
    `${firstName} ${lastName}`.trim() ||
    person?.name ||
    person?.user?.username ||
    person?.email ||
    'Persona sin nombre'
  );
}

function getPersonEmail(person: any): string {
  return String(person?.email || person?.user?.username || '');
}

function getPersonDocument(person: any): string {
  return String(person?.identification_number || person?.documentNumber || person?.document || '');
}

function getPersonStatus(person: any): string {
  if (typeof person?.user?.is_active === 'boolean') return person.user.is_active ? 'ACTIVO' : 'INACTIVO';
  if (typeof person?.is_active === 'boolean') return person.is_active ? 'ACTIVO' : 'INACTIVO';
  return String(person?.status || 'ACTIVO').toUpperCase();
}

function extractUsersPage(response: any): UsersPageResponse {
  if (Array.isArray(response)) {
    return { data: response };
  }
  if (Array.isArray(response?.data)) {
    return { data: response.data, meta: response.meta };
  }
  if (Array.isArray(response?.data?.data)) {
    return { data: response.data.data, meta: response.data.meta };
  }
  return { data: [], meta: response?.meta || response?.data?.meta };
}

async function fetchAllPersons(): Promise<any[]> {
  const persons: any[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await apiClient.get<any>(USERS_ENDPOINT, {
      page,
      limit: USERS_PAGE_SIZE,
      status: 'all',
    }, { skipErrorToast: true });
    const { data = [], meta } = extractUsersPage(response);
    persons.push(...data);

    totalPages = Number(meta?.totalPages || (data.length < USERS_PAGE_SIZE ? page : page + 1));
    page += 1;
  } while (page <= totalPages);

  return persons;
}

function getFolderForPerson(person: any, index: number) {
  const personKey = getPersonKey(person);
  const docs = getDocsForPerson(personKey);
  const validos = docs.filter((d: any) => d.estado === 'validado').length;
  const pendientes = docs.filter((d: any) => d.estado === 'pendiente').length;
  const rechazados = docs.filter((d: any) => d.estado === 'rechazado').length;
  const vencidos = docs.filter((d: any) => d.estado === 'vencido').length;
  const updatedAt = person?.updated_at || person?.updatedAt || person?.user?.updated_at || person?.created_at || person?.createdAt || new Date().toISOString();

  return {
    id: `carpeta:${personKey}`,
    persona_id: personKey,
    nombre_carpeta: getPersonName(person),
    email_propietario: getPersonEmail(person),
    numero_documento: getPersonDocument(person),
    total_documentos: docs.length,
    documentos_completos: validos,
    documentos_pendientes: pendientes,
    documentos_rechazados: rechazados,
    documentos_vencidos: vencidos,
    ultima_actualizacion: updatedAt,
    fecha_creacion: person?.created_at || person?.createdAt || person?.user?.created_at || updatedAt,
    estado: getPersonStatus(person),
    seccional: person?.seccional || null,
    sede: person?.sede || null,
    source_persona: person,
    orden: index + 1,
  };
}

function getDocsMap(): Record<string, any[]> {
  return readStore<Record<string, any[]>>(STORAGE_DOCS, {});
}

function setDocsMap(map: Record<string, any[]>): void {
  writeStore(STORAGE_DOCS, map);
}

function getDocsForPerson(personKey: string) {
  const map = getDocsMap();
  return map[personKey] || [];
}

function setDocsForPerson(personKey: string, docs: any[]) {
  const map = getDocsMap();
  map[personKey] = docs;
  setDocsMap(map);
}

function objectUrlForFile(file: File): string {
  return typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
    ? URL.createObjectURL(file)
    : '';
}

function normalizeList(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.data?.data)) return raw.data.data;
  return [];
}

function mergeFolderWithLocalDocs(folder: any, index: number) {
  const personKey = normalizeCarpetaId(folder?.persona_id || folder?.id || '');
  const docs = getDocsForPerson(personKey);
  const validos = docs.filter((d: any) => d.estado === 'validado').length;
  const pendientes = docs.filter((d: any) => d.estado === 'pendiente').length;
  const rechazados = docs.filter((d: any) => d.estado === 'rechazado').length;
  const vencidos = docs.filter((d: any) => d.estado === 'vencido').length;

  return {
    ...folder,
    id: String(folder?.id || `carpeta:${personKey}`).startsWith('carpeta:')
      ? folder.id
      : `carpeta:${personKey}`,
    persona_id: personKey,
    total_documentos: docs.length,
    documentos_completos: validos,
    documentos_pendientes: pendientes,
    documentos_rechazados: rechazados,
    documentos_vencidos: vencidos,
    orden: folder?.orden || index + 1,
  };
}

function getTemplates() {
  return readStore<any[]>(STORAGE_TEMPLATES, DEFAULT_TEMPLATES);
}

export async function fetchAPI(): Promise<ServiceResult> {
  return { success: true, data: null };
}

export const documentosService = {
  async getAllCarpetas(): Promise<ServiceResult<any[]>> {
    try {
      const raw = await apiClient.get<any>(CARPETAS_DIGITALES_ENDPOINT, undefined, { skipErrorToast: true });
      const carpetas = normalizeList(raw).map(mergeFolderWithLocalDocs);
      return { success: true, data: carpetas.filter((folder) => folder.persona_id) };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Error al cargar carpetas digitales desde la base de datos' };
    }
  },

  async getCarpetaByPersona(personaId: string): Promise<ServiceResult<any>> {
    const personKey = normalizeCarpetaId(personaId);
    try {
      const raw = await apiClient.get<any>(`${CARPETAS_DIGITALES_ENDPOINT}/persona/${personKey}`, undefined, { skipErrorToast: true });
      return { success: true, data: mergeFolderWithLocalDocs(raw?.data || raw, 0) };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Error al cargar la carpeta digital' };
    }
  },

  async getAll(): Promise<ServiceResult<any[]>> {
    return { success: true, data: Object.values(getDocsMap()).flat() };
  },

  async getDocumentosByCarpeta(carpetaId: string): Promise<ServiceResult<any[]>> {
    const personKey = normalizeCarpetaId(carpetaId);
    return { success: true, data: getDocsForPerson(personKey) };
  },

  async getTiposDocumentos(): Promise<ServiceResult<any[]>> {
    return tiposDocumentosService.getAll();
  },

  async getChecklistForPersona(personaId: string): Promise<ServiceResult<any>> {
    const personKey = normalizeCarpetaId(personaId);
    const docs = getDocsForPerson(personKey);

    try {
      const raw = await apiClient.get<any>(
        `${CARPETAS_DIGITALES_ENDPOINT}/persona/${personKey}/checklist`,
        undefined,
        { skipErrorToast: true }
      );
      const payload = raw?.data || raw;
      const tiposDocumentos = normalizeList(payload?.tiposDocumentos || payload?.tipos_documentos || payload).map((tipo) => {
        const tipoNombre = normalizeDocumentText(tipo.nombre_documento || tipo.nombre);
        const matchedDoc = docs.find((doc) => {
          if (doc.tipo_documento_id && doc.tipo_documento_id === tipo.id) return true;
          if (doc.tipo_documento_id) return false;
          const docNombre = normalizeDocumentText(doc.nombre);
          return !!tipoNombre && !!docNombre && (docNombre.includes(tipoNombre) || tipoNombre.includes(docNombre));
        });
        return { ...tipo, completado: !!matchedDoc, documento: matchedDoc || null };
      });
      return { success: true, data: { tiposDocumentos, carpeta: payload?.carpeta || null, useGlobalTypes: false } };
    } catch (error: any) {
      const tiposResult = await tiposDocumentosService.getAll();
      if (!tiposResult.success) return { success: false, error: tiposResult.error || error?.message || 'Error al cargar configuración documental' };

      const tiposDocumentos = (tiposResult.data || []).filter((tipo) => tipo.activo).map((tipo) => {
        const tipoNombre = normalizeDocumentText(tipo.nombre_documento || tipo.nombre);
        const matchedDoc = docs.find((doc) => {
          if (doc.tipo_documento_id && doc.tipo_documento_id === tipo.id) return true;
          if (doc.tipo_documento_id) return false;
          const docNombre = normalizeDocumentText(doc.nombre);
          return !!tipoNombre && !!docNombre && (docNombre.includes(tipoNombre) || tipoNombre.includes(docNombre));
        });
        return { ...tipo, completado: !!matchedDoc, documento: matchedDoc || null };
      });
      return { success: true, data: { tiposDocumentos, useGlobalTypes: true } };
    }
  },

  async uploadFile(file: File, carpetaId: string, categoria = 'otros', metadata?: Record<string, any>): Promise<ServiceResult<any>> {
    const personKey = normalizeCarpetaId(carpetaId);
    const docs = getDocsForPerson(personKey);
    const doc = {
      id: getId(),
      carpeta_id: `carpeta:${personKey}`,
      nombre: file.name,
      categoria,
      tipo_archivo: file.name.split('.').pop()?.toLowerCase() || file.type || 'archivo',
      tipo: file.type || file.name.split('.').pop()?.toLowerCase() || 'archivo',
      tamano_bytes: file.size,
      estado: 'pendiente',
      fecha_subida: new Date().toISOString(),
      version_actual: 1,
      tipo_documento_id: metadata?.tipo_documento_id,
      url_archivo: objectUrlForFile(file),
      comentarios: '',
    };
    setDocsForPerson(personKey, [doc, ...docs]);
    await syncPersonDocumentsToPTABackend(`carpeta:${personKey}`);
    return { success: true, data: doc };
  },

  async update(id: string, updates: any): Promise<ServiceResult<any>> {
    const res = updateDoc(id, updates);
    if (res.success && res.data) {
      await syncPersonDocumentsToPTABackend(res.data.carpeta_id);
    }
    return res;
  },

  async delete(id: string): Promise<ServiceResult> {
    const map = getDocsMap();
    let affectedCarpeta: string | null = null;
    Object.keys(map).forEach((key) => {
      const found = map[key].find((doc) => doc.id === id);
      if (found) affectedCarpeta = key;
      map[key] = map[key].filter((doc) => doc.id !== id);
    });
    setDocsMap(map);
    if (affectedCarpeta) {
      await syncPersonDocumentsToPTABackend(`carpeta:${affectedCarpeta}`);
    }
    return { success: true };
  },

  async getDownloadUrl(id: string): Promise<ServiceResult<any>> {
    const doc = findDoc(id);
    return { success: true, data: { url: doc?.url_archivo || doc?.url || 'about:blank' } };
  },

  async validarDocumento(id: string, validadoPor: string = 'Administrador'): Promise<ServiceResult<any>> {
    // Persistir en el backend (fuente de verdad). Antes solo se escribía en el
    // cache local (localStorage), por lo que la aprobación se perdía al recargar.
    try {
      await apiClient.put<any>(`${CARPETAS_DIGITALES_ENDPOINT}/documentos/${id}/validate`, {
        estado: 'validado',
        validadoPor,
      });
    } catch (err: any) {
      return { success: false, error: err?.message || 'No se pudo validar el documento en el servidor' };
    }
    // Sincronizar el cache local para reflejo inmediato en la UI.
    const res = updateDoc(id, { estado: 'validado', fecha_validacion: new Date().toISOString(), validado_por: validadoPor });
    if (res.success && res.data?.carpeta_id) {
      await syncPersonDocumentsToPTABackend(res.data.carpeta_id);
    }
    return res.success ? res : { success: true, data: { id, estado: 'validado' } };
  },

  async rechazarDocumento(id: string, validadorId?: string, motivo?: string): Promise<ServiceResult<any>> {
    // Persistir el rechazo en el backend (mismo problema que la validación: antes
    // solo quedaba en localStorage y se perdía al recargar).
    try {
      await apiClient.put<any>(`${CARPETAS_DIGITALES_ENDPOINT}/documentos/${id}/validate`, {
        estado: 'rechazado',
        validadoPor: validadorId || 'Administrador',
        comentarios: motivo || 'Rechazado',
      });
    } catch (err: any) {
      return { success: false, error: err?.message || 'No se pudo rechazar el documento en el servidor' };
    }
    const res = updateDoc(id, { estado: 'rechazado', comentarios: motivo || 'Rechazado' });
    if (res.success && res.data?.carpeta_id) {
      await syncPersonDocumentsToPTABackend(res.data.carpeta_id);
    }
    return res.success ? res : { success: true, data: { id, estado: 'rechazado' } };
  },

  async eliminarTodosLosDocumentos(): Promise<ServiceResult> {
    const documentosEliminados = Object.values(getDocsMap()).reduce((total, docs) => total + docs.length, 0);
    writeStore(STORAGE_DOCS, {});
    return {
      success: true,
      stats: {
        documentos_eliminados: documentosEliminados,
      },
    };
  },

  async downloadMultipleAsZip(): Promise<ServiceResult<any>> {
    return { success: false, error: 'Descarga ZIP no disponible en modo frontend local' };
  },

  async reclassify(id: string, data: { categoria?: string; tipo_documento_id?: string }): Promise<ServiceResult<any>> {
    const res = updateDoc(id, data);
    if (res.success && res.data) {
      await syncPersonDocumentsToPTABackend(res.data.carpeta_id);
    }
    return res;
  },

  async updateDocumentCategory(id: string, categoria: string, tipoDocumentoId?: string): Promise<ServiceResult<any>> {
    const result = await updateDoc(id, { categoria, tipo_documento_id: tipoDocumentoId });
    if (result.success && result.data) {
      await syncPersonDocumentsToPTABackend(result.data.carpeta_id);
    }
    return { ...result, version: { numero_version: findDoc(id)?.version_actual || 1 } };
  },

  async crearNuevaVersion(id: string, file: File, comentarios?: string, etiqueta?: string): Promise<ServiceResult<any>> {
    const doc = findDoc(id);
    if (!doc) return { success: false, error: 'Documento no encontrado' };
    const nextVersion = (doc.version_actual || 1) + 1;
    const res = updateDoc(id, {
      nombre: file.name,
      tamano_bytes: file.size,
      tipo_archivo: file.name.split('.').pop()?.toLowerCase() || doc.tipo_archivo,
      version_actual: nextVersion,
      ultima_modificacion: new Date().toISOString(),
      comentarios,
      etiqueta,
      url_archivo: objectUrlForFile(file),
      estado: 'pendiente'
    });
    if (res.success && res.data) {
      await syncPersonDocumentsToPTABackend(res.data.carpeta_id);
    }
    return res;
  },

  async getVersiones(id: string): Promise<ServiceResult<any>> {
    const doc = findDoc(id);
    const versionActual = doc?.version_actual || 1;
    return {
      success: true,
      data: {
        version_actual: versionActual,
        versiones: Array.from({ length: versionActual }, (_, index) => ({
          id: `${id}:v:${index + 1}`,
          numero_version: index + 1,
          nombre_archivo: doc?.nombre || 'Documento',
          tamano_bytes: doc?.tamano_bytes || 0,
          fecha_creacion: doc?.fecha_subida || new Date().toISOString(),
          creado_por: 'Sistema',
          comentarios: index + 1 === versionActual ? 'Version actual' : 'Version anterior',
          etiqueta: index + 1 === versionActual ? 'actual' : 'historica',
          es_version_actual: index + 1 === versionActual,
        })),
      },
    };
  },

  async downloadVersion(id: string): Promise<ServiceResult<any>> {
    return this.getDownloadUrl(id);
  },

  async restaurarVersion(id: string): Promise<ServiceResult<any>> {
    const res = updateDoc(id, { ultima_modificacion: new Date().toISOString() });
    if (res.success && res.data) {
      await syncPersonDocumentsToPTABackend(res.data.carpeta_id);
    }
    return res;
  },

  async actualizarEtiquetaVersion(): Promise<ServiceResult> {
    return { success: true };
  },

  async eliminarVersion(): Promise<ServiceResult> {
    return { success: true };
  },
};

async function syncPersonDocumentsToPTABackend(carpetaId: string): Promise<void> {
  try {
    const personKey = normalizeCarpetaId(carpetaId);
    const docs = getDocsForPerson(personKey);
    // Call the sync documents endpoint
    await apiClient.post(`/pta/api/v1/rund/docente/${personKey}/sync-documents`, {
      documentos: docs.map((d: any) => ({
        id: d.id,
        categoria: d.categoria,
        estado: d.estado,
        fecha_subida: d.fecha_subida || d.fecha_carga,
        fecha_validacion: d.fecha_validacion,
        validado_por: d.validado_por,
        comentarios: d.comentarios || d.observacion
      }))
    }, { skipErrorToast: true });
  } catch (error) {
    console.error('Error syncing documents to PTA backend:', error);
  }
}

function findDoc(id: string): any | null {
  const map = getDocsMap();
  for (const docs of Object.values(map)) {
    const found = docs.find((doc) => doc.id === id);
    if (found) return found;
  }
  return null;
}

function updateDoc(id: string, updates: any): ServiceResult<any> {
  const map = getDocsMap();
  for (const key of Object.keys(map)) {
    const index = map[key].findIndex((doc) => doc.id === id);
    if (index >= 0) {
      map[key][index] = { ...map[key][index], ...updates, updated_at: new Date().toISOString() };
      setDocsMap(map);
      return { success: true, data: map[key][index] };
    }
  }
  return { success: false, error: 'Documento no encontrado' };
}

export const tiposDocumentosService = {
  async getAll(): Promise<ServiceResult<any[]>> {
    try {
      const raw = await apiClient.get<any>(TIPOS_DOCUMENTOS_ENDPOINT, undefined, { skipErrorToast: true });
      return { success: true, data: normalizeList(raw) };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Error al cargar tipos de documentos' };
    }
  },
  async create(tipo: any): Promise<ServiceResult<any>> {
    try {
      const raw = await apiClient.post<any>(TIPOS_DOCUMENTOS_ENDPOINT, tipo);
      return { success: true, data: raw?.data || raw };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Error al crear tipo de documento' };
    }
  },
  async update(id: string, tipo: any): Promise<ServiceResult<any>> {
    try {
      const raw = await apiClient.put<any>(`${TIPOS_DOCUMENTOS_ENDPOINT}/${id}`, tipo);
      return { success: true, data: raw?.data || raw };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Error al actualizar tipo de documento' };
    }
  },
  async delete(id: string): Promise<ServiceResult> {
    try {
      await apiClient.delete(`${TIPOS_DOCUMENTOS_ENDPOINT}/${id}`);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error?.message || 'Error al eliminar tipo de documento' };
    }
  },
};

export const checklistTemplatesService = {
  async getAll(): Promise<ServiceResult<any[]>> {
    return { success: true, data: getTemplates() };
  },
  async save(template: any): Promise<ServiceResult<any>> {
    const templates = getTemplates();
    const saved = { ...template, id: template.id || getId(), activo: template.activo ?? true };
    const next = template.id ? templates.map((item) => item.id === template.id ? saved : item) : [saved, ...templates];
    writeStore(STORAGE_TEMPLATES, next);
    return { success: true, data: saved };
  },
  async delete(id: string): Promise<ServiceResult> {
    writeStore(STORAGE_TEMPLATES, getTemplates().filter((item) => item.id !== id));
    return { success: true };
  },
  async getMatrix(): Promise<ServiceResult<any>> {
    const [carpetas, tipos] = await Promise.all([
      documentosService.getAllCarpetas(),
      tiposDocumentosService.getAll(),
    ]);
    return {
      success: carpetas.success && tipos.success,
      data: { rows: carpetas.data || [], tipos: tipos.data || [] },
      error: carpetas.error || tipos.error,
    };
  },
};

export const scopeService = {
  async getUserScope(): Promise<ServiceResult<any>> {
    return { success: true, data: { tipo_alcance: 'global', territoriales: [], cetaps: [], programas: [], descripcion_alcance: 'Acceso global' } };
  },
};

export const supabaseService = {
  documentos: documentosService,
  tiposDocumentos: tiposDocumentosService,
  checklistTemplates: checklistTemplatesService,
  scope: scopeService,
};

export default supabaseService;
