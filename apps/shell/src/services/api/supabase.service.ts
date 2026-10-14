import { createCarpetaDigitalDocuments } from '../../../../../packages/shared-hooks/src/createCarpetaDigitalDocuments';
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

export const documentosService = createCarpetaDigitalDocuments(apiClient, getDocsMap, () => tiposDocumentosService.getAll());

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
