import { apiClient } from '../../../../shell/src/services/api';

type ApiResult<T> = { success: boolean; data: T };

const SERVICE_BASE = '/pta/api/v1';
const PTA_BASE = SERVICE_BASE;

function normalizeResult<T>(raw: any, fallback: T): ApiResult<T> {
  if (raw !== undefined && raw !== null) {
    // Si raw es un array, o si no tiene las props de wrapper, apiClient ya lo desenvolvió
    const success = raw.success !== false && raw.exito !== false && raw.ok !== false;
    const data = (raw.data !== undefined ? raw.data : (raw.datos !== undefined ? raw.datos : (raw.result !== undefined ? raw.result : raw))) as T;
    return { success, data: (data ?? fallback) as T };
  }
  return { success: false, data: fallback };
}

function asObject(raw: any): Record<string, any> {
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
}


export async function getActivePeriodoAcademico() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/periodos-academicos`);
    const normalized = normalizeResult<any[]>(raw, []);
    if (normalized.success && Array.isArray(normalized.data)) {
      const active = normalized.data.find(p => p.estado === 'en_curso');
      if (active) return active;
      if (normalized.data.length > 0) return normalized.data[0];
    }
    const year = new Date().getFullYear();
    const sem = new Date().getMonth() < 6 ? 1 : 2;
    return { codigo: `${year}-${sem}` };
  } catch (error) {
    console.error('Error fetching active periodo:', error);
    const year = new Date().getFullYear();
    const sem = new Date().getMonth() < 6 ? 1 : 2;
    return { codigo: `${year}-${sem}` };
  }
}

export async function getPeriodosAcademicos() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/periodos-academicos`);
    return normalizeResult<any[]>(raw, []);
  } catch (error) {
    console.error('Error fetching academic periods:', error);
    return { success: false, data: [] };
  }
}

export async function getAllPTAs(filters?: {
  estado?: string;
  periodo?: string;
  programa?: string;
  nivelAprobacion?: number;
  isSuperUser?: boolean;
}) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/todos`, filters);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getAllPTAs] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getPTAsByDocente(docenteId: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/mis-ptas/${docenteId}`);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getPTAsByDocente] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getPTAById(id: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/id/${id}`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getPTAById] Error:', error);
    return { success: false, data: null };
  }
}

export async function savePTA(data: any) {
  try {
    // Collect any File objects from investigation resoluciones
    const files: { key: string; file: File }[] = [];

    // Check project-level resolution file
    if (data.investigacion_proyecto?.resolucion_archivo instanceof File) {
      files.push({ key: 'inv_proyecto_resolucion', file: data.investigacion_proyecto.resolucion_archivo });
      data = {
        ...data,
        investigacion_proyecto: {
          ...data.investigacion_proyecto,
          resolucion_archivo: undefined,
          _tiene_archivo_resolucion: true,
        },
      };
    }

    // Check activity-level resolution files
    if (Array.isArray(data.investigacion_actividades)) {
      const cleanedActividades = data.investigacion_actividades.map((act: any, idx: number) => {
        if (act.resolucion_archivo instanceof File) {
          files.push({ key: `inv_actividad_${idx}_resolucion`, file: act.resolucion_archivo });
          return { ...act, resolucion_archivo: undefined, _tiene_archivo_resolucion: true };
        }
        return act;
      });
      data = { ...data, investigacion_actividades: cleanedActividades };
    }

    let raw: any;
    if (files.length > 0) {
      // Use FormData to send both JSON payload + files
      const formData = new FormData();
      formData.append('payload', JSON.stringify(data));
      files.forEach(f => formData.append(f.key, f.file, f.file.name));
      raw = await (apiClient as any).upload<any>(`${PTA_BASE}/save`, formData);
    } else {
      raw = await apiClient.post<any>(`${PTA_BASE}/save`, data);
    }

    const normalized = normalizeResult<any>(raw, null);
    return { ...asObject(raw), success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][savePTA] Error:', error);
    return { success: false, data: null };
  }
}

export async function getConfiguracionPTAGlobal() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/configuracion`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getConfiguracionPTAGlobal] Error:', error);
    return { success: false, data: null };
  }
}

export async function updateConfiguracionPTAGlobal(rules: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/configuracion`, { rules });
    const normalized = normalizeResult<any>(raw, null);
    return {
      ...asObject(raw),
      success: normalized.success,
      data: normalized.data,
    };
  } catch (error) {
    console.error('[mfe-pta][updateConfiguracionPTAGlobal] Error:', error);
    return { success: false, data: null };
  }
}

export async function getPTAEstadisticas(periodo?: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/estadisticas`, periodo ? { periodo } : undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getPTAEstadisticas] Error:', error);
    return { success: false, data: null };
  }
}

export async function getCatalogoProgramas() {
  try {
    // Cache-busting: _t evita HTTP 304, garantiza datos frescos del origen
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/programas`, { _t: Date.now().toString() });
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoProgramas] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getCatalogoProgramasCascada(cetapId: string, periodo?: string) {
  try {
    // Primary: use programas-por-sede endpoint (handles auth.sedes.id_sede correctly)
    const params: Record<string, string> = { cetap_id: cetapId, _t: Date.now().toString() };
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/programas-por-sede`, params);
    const normalized = normalizeResult<any[]>(raw, []);
    const data = Array.isArray(normalized.data) ? normalized.data : [];
    if (data.length > 0) {
      return { success: true, data };
    }
    // Fallback: try cascada endpoint (uses academic_work_plan.cetap.id)
    if (periodo) params.periodo = periodo;
    const raw2 = await apiClient.get<any>(`${PTA_BASE}/cascada/programas`, params);
    const normalized2 = normalizeResult<any[]>(raw2, []);
    const data2 = Array.isArray(normalized2.data) ? normalized2.data : [];
    return { success: data2.length > 0 || normalized2.success, data: data2 };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoProgramasCascada] Error:', error);
    return { success: false, data: [] };
  }
}

/** Asignaturas con horas_pta calculadas por el backend (HorasPtaCalculator) - CASCADA DINÁMICA */
export async function getCatalogoAsignaturasCascada(programaId: string) {
  try {
    const params: Record<string, string> = { programa_id: programaId, _t: Date.now().toString() };
    const raw = await apiClient.get<any>(`${PTA_BASE}/cascada/asignaturas`, params);
    const normalized = normalizeResult<any[]>(raw, []);
    const data = Array.isArray(normalized.data) ? normalized.data : [];
    return { success: data.length > 0 || normalized.success, data };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoAsignaturasCascada] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getCatalogoAsignaturas(programaId?: string) {
  try {
    const params: Record<string, string> = { _t: Date.now().toString() };
    if (programaId) params.programa_id = programaId;
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/asignaturas`, params);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoAsignaturas] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getCatalogoAsignaturasCompleto() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/asignaturas`, { completo: 'true' });
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoAsignaturasCompleto] Error:', error);
    return { success: false, data: [] };
  }
}

/** CETAPs filtrados por programa (vía oferta_cetap_programa) - DINÁMICO */
export async function getCetapsPorPrograma(programaId: string, territorialId?: string) {
  try {
    const params: Record<string, string> = { programa_id: programaId };
    if (territorialId) params.territorial_id = territorialId;
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/cetaps-por-programa`, params);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getCetapsPorPrograma] Error:', error);
    return { success: false, data: [] };
  }
}

/** Cupos estimados para CETAP + Programa - DINÁMICO */
export async function getOfertaCetap(cetapId: string, programaId: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/oferta-cetap`, {
      cetap_id: cetapId,
      programa_id: programaId,
    });
    const normalized = normalizeResult<any>(raw, { cupos_estimados: null });
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getOfertaCetap] Error:', error);
    return { success: false, data: { cupos_estimados: null } };
  }
}

export async function getCatalogoTerritoriales(periodo?: string) {
  try {
    const params = periodo ? { periodo } : undefined;
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/territoriales`, params);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoTerritoriales] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getCatalogoCetaps(territorialId: string, periodo?: string) {
  try {
    const params: Record<string, string> = {};
    if (territorialId) params.territorial_id = territorialId;
    if (periodo) params.periodo = periodo;
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/cetaps`, params);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoCetaps] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getCatalogoActividadesInvestigacion() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/actividades/investigacion`);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoActividadesInvestigacion] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getCatalogoActividadesExtension() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/actividades/extension`);
    const normalized = normalizeResult<Record<string, any[]>>(raw, {});
    const data = normalized.data && typeof normalized.data === 'object' && !Array.isArray(normalized.data) ? normalized.data : {};
    return { success: normalized.success, data };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoActividadesExtension] Error:', error);
    return { success: false, data: {} };
  }
}

export async function getCatalogoSeccionesExtension() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/secciones/extension`);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoSeccionesExtension] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getCatalogoActividadesComplementarias() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/actividades/complementarias`);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoActividadesComplementarias] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getCatalogoActividadesAcademicoAdmin() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/actividades/academico-admin`);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoActividadesAcademicoAdmin] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getCatalogoRolesInvestigacion() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/roles-investigacion`);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getCatalogoRolesInvestigacion] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getDocentesDisponibles(periodo?: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/docentes-disponibles`, periodo ? { periodo } : undefined);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getDocentesDisponibles] Error:', error);
    return { success: false, data: [] };
  }
}

export async function crearPTAPreCarga(_data: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/precarga`, _data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][crearPTAPreCarga] Error:', error);
    return { success: false, data: null };
  }
}

export async function notificarDocentePTA(_ptaId: string, _data: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${_ptaId}/notificar`, _data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][notificarDocentePTA] Error:', error);
    return { success: false, data: null };
  }
}

export async function responderPropuestaPTA(_ptaId: string, _data: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${_ptaId}/respuesta-docente`, _data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][responderPropuestaPTA] Error:', error);
    return { success: false, data: null };
  }
}

export async function getPTAsConcertacion() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/concertacion`);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getPTAsConcertacion] Error:', error);
    return { success: false, data: [] };
  }
}

export async function seedPTAs() {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/seed`, undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][seedPTAs] Error:', error);
    return { success: false };
  }
}

export async function updatePTAStatus(
  ptaId: string,
  data: {
    accion?: 'aprobar' | 'devolver' | 'avanzar_sin_cambios' | 'reenviar_corregido';
    estado?: string;
    observaciones?: string;
    motivo_devolucion?: string;
    actorId?: string;
    actorRol?: string;
    nivelAprobacion?: number;
    actorTerritorialId?: string;
    isSuperUser?: boolean;
    aprobarTodas?: boolean;
    aprobador_id?: string;
    aprobador_nombre?: string;
  },
) {
  try {
    const body = {
      ...data,
      actorId: data.actorId || data.aprobador_id,
    };
    const raw = await apiClient.post<any>(`${PTA_BASE}/${ptaId}/estado`, body);
    const normalized = normalizeResult<any>(raw, null);
    const flattened =
      normalized.data && typeof normalized.data === 'object' && !Array.isArray(normalized.data) ? normalized.data : {};
    return {
      ...asObject(raw),
      ...flattened,
      success: normalized.success,
      data: normalized.data,
    };
  } catch (error) {
    console.error('[mfe-pta][updatePTAStatus] Error:', error);
    return { success: false };
  }
}

export async function getComponentesAprobacion(ptaId: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/${ptaId}/componentes-aprobacion`);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.warn('[mfe-pta][getComponentesAprobacion] No disponible:', error instanceof Error ? error.message : error);
    return { success: false, data: [] };
  }
}

export async function aprobarComponente(ptaId: string, data: {
  componente: string;
  estado: 'aprobado' | 'devuelto';
  aprobadorId: string;
  aprobadorNombre: string;
  aprobadorRol: string;
  comentarios?: string;
  scope?: string;
  scopeId?: string;
  componentesAutorizados?: string[];
  isSuperUser?: boolean;
}) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${ptaId}/aprobar-componente`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][aprobarComponente] Error:', error);
    return { success: false, data: null };
  }
}

export async function deletePTA(ptaId: string) {
  try {
    const raw = await apiClient.delete<any>(`${PTA_BASE}/${ptaId}`);
    const normalized = normalizeResult<any>(raw, null);
    return { ...asObject(raw), success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][deletePTA] Error:', error);
    return { success: false };
  }
}

export async function guardarFirmaDigitalPTA(
  ptaId: string,
  firmaData: {
    hash: string;
    firmado_por: string;
    firmado_por_nombre: string;
    firmado_por_rol: string;
    certificado?: string;
    metadata?: any;
  },
) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${ptaId}/firma-digital`, firmaData);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][guardarFirmaDigitalPTA] Error:', error);
    return { success: false };
  }
}

export async function requestPTAFirmaDocenteCode(data: {
  ptaId?: string;
  docenteId: string;
  periodo?: string;
  etapaLabel?: string;
}) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/firma-docente/request-code`, data);
    const normalized = normalizeResult<any>(raw, null);
    return {
      ...asObject(raw),
      success: normalized.success,
      data: normalized.data,
    };
  } catch (error) {
    console.error('[mfe-pta][requestPTAFirmaDocenteCode] Error:', error);
    return { success: false, data: null };
  }
}

export async function verifyPTAFirmaDocenteCode(data: {
  verificationId: string;
  code: string;
}) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/firma-docente/verify-code`, data);
    const normalized = normalizeResult<any>(raw, null);
    return {
      ...asObject(raw),
      success: normalized.success,
      data: normalized.data,
    };
  } catch (error) {
    console.error('[mfe-pta][verifyPTAFirmaDocenteCode] Error:', error);
    return { success: false, data: null };
  }
}

export async function getAprobacionesJefatura(ptaId: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/${ptaId}/aprobaciones-jefatura`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getAprobacionesJefatura] Error:', error);
    return { success: false, data: null };
  }
}

export async function getPTAUserData(userId: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/user-data/${encodeURIComponent(userId)}`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getPTAUserData] Error:', error);
    return { success: false, data: null };
  }
}

export async function savePTAUserData(
  userId: string,
  data: {
    pinned_pta_ids?: string[];
    saved_tags?: string[];
    notes?: Record<string, string>;
    favorite_views?: string[];
  },
) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/user-data/${encodeURIComponent(userId)}`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][savePTAUserData] Error:', error);
    return { success: false };
  }
}

export async function getAllPtasConEvidencias(periodo?: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/evidencias/ptas`, periodo ? { periodo } : undefined);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getAllPtasConEvidencias] Error:', error);
    return { success: false, data: [] };
  }
}

export async function revisarEvidenciaPTA(
  ptaId: string,
  evidenciaId: string,
  data: { decision: 'aprobado' | 'rechazado' | 'aprobada' | 'rechazada'; observaciones?: string; revisado_por?: string; comentario?: string },
) {
  try {
    const raw = await apiClient.patch<any>(`${PTA_BASE}/${ptaId}/evidencias/${evidenciaId}`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][revisarEvidenciaPTA] Error:', error);
    return { success: false };
  }
}

export async function getEvidenciasPTA(ptaId: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/${ptaId}/evidencias`);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getEvidenciasPTA] Error:', error);
    return { success: false, data: [] };
  }
}

export async function uploadEvidenciaFile(ptaId: string, file: File) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const raw = await (apiClient as any).upload<any>(`${PTA_BASE}/${ptaId}/evidencias/upload`, formData);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][uploadEvidenciaFile] Error:', error);
    return { success: false, data: null };
  }
}

export async function registrarEvidenciaPTA(ptaId: string, payload: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${ptaId}/evidencias`, payload);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][registrarEvidenciaPTA] Error:', error);
    return { success: false, data: null };
  }
}

export async function eliminarEvidenciaPTA(ptaId: string, evidenciaId: string) {
  try {
    const raw = await apiClient.delete<any>(`${PTA_BASE}/${ptaId}/evidencias/${evidenciaId}`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][eliminarEvidenciaPTA] Error:', error);
    return { success: false };
  }
}

export async function getSolicitudesPTA(estado?: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/solicitudes`, estado ? { estado } : undefined);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getSolicitudesPTA] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getSolicitudesSNI(_filters?: any) {
  return getSolicitudesPTA('PENDIENTE_SNI');
}

export async function getSolicitudesSNPI(_filters?: any) {
  return getSolicitudesPTA('PENDIENTE_SNPI');
}

export async function resolverSolicitudSNI(_solicitudId: string, _data: any) {
  return resolverSolicitudPTA(_solicitudId, { ...(typeof _data === 'object' ? _data : {}), actorRol: 'SNI' });
}

export async function resolverSolicitudSNPI(_solicitudId: string, _data: any) {
  return resolverSolicitudPTA(_solicitudId, { ...(typeof _data === 'object' ? _data : {}), actorRol: 'SNPI' });
}

export async function resolverSolicitudPTA(
  solicitudId: string,
  data: {
    decision: 'aprobado' | 'denegado';
    motivo?: string;
    accion?: string;
    territorialNueva?: string;
    horasPtaOriginal?: number;
    horasPtaNuevo?: number;
    resueltoPor?: string;
  },
) {
  try {
    const raw = await apiClient.patch<any>(`${PTA_BASE}/solicitudes/${solicitudId}/resolver`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][resolverSolicitudPTA] Error:', error);
    return { success: false };
  }
}

export async function getAuditoriaPTA(filters?: { periodo?: string; accion?: string }) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/auditoria`, filters || undefined);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getAuditoriaPTA] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getDashboardKPIs(_periodo?: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/dashboard/kpis`, _periodo ? { periodo: _periodo } : undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getDashboardKPIs] Error:', error);
    return { success: false, data: null };
  }
}

export async function getWorkflowAnalytics(_periodo?: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/workflow/analytics`, _periodo ? { periodo: _periodo } : undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getWorkflowAnalytics] Error:', error);
    return { success: false, data: null };
  }
}

export async function getReporteNacional(_periodo?: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/reportes/nacional`, _periodo ? { periodo: _periodo } : undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getReporteNacional] Error:', error);
    return { success: false, data: null };
  }
}

export async function getTerritorialDetalle(_territorialNombre: string, _periodo?: string) {
  try {
    const raw = await apiClient.get<any>(
      `${PTA_BASE}/territorial/${encodeURIComponent(_territorialNombre)}`,
      _periodo ? { periodo: _periodo } : undefined,
    );
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getTerritorialDetalle] Error:', error);
    return { success: false, data: null };
  }
}

export async function getDashboardDirectivo(_periodo?: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/dashboard/directivo`, _periodo ? { periodo: _periodo } : undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getDashboardDirectivo] Error:', error);
    return { success: false, data: null };
  }
}

export async function getReporteSeguimiento(_filters?: any) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/reportes/seguimiento`, _filters || undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getReporteSeguimiento] Error:', error);
    return { success: false, data: null };
  }
}

export async function getRUNDDocente(_docenteId: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/rund/docente/${encodeURIComponent(_docenteId)}`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.warn('[mfe-pta][getRUNDDocente] RUND no disponible (no crítico):', error instanceof Error ? error.message : error);
    return { success: false, data: null };
  }
}

export async function getRUNDResumen(_periodo?: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/rund/resumen`, _periodo ? { periodo: _periodo } : undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getRUNDResumen] Error:', error);
    return { success: false, data: null };
  }
}

export async function calcularHorasPTA(_payload: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/catalogos/calcular-horas-programables`, _payload);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.warn('[mfe-pta][calcularHorasPTA] Error:', error);
    return { success: false, data: null };
  }
}

export async function getOfertaAcademica(_periodo?: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/oferta-academica`, _periodo ? { periodo: _periodo } : undefined);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getOfertaAcademica] Error:', error);
    return { success: false, data: [] };
  }
}

export async function saveOfertaAcademica(_payload: any, _data?: any) {
  try {
    const body = _data === undefined ? _payload : { periodo: _payload, data: _data };
    const raw = await apiClient.post<any>(`${PTA_BASE}/oferta-academica`, body);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][saveOfertaAcademica] Error:', error);
    return { success: false, data: null };
  }
}

export async function getAsignacionesDocentes(_periodo?: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/asignaciones-docentes`, _periodo ? { periodo: _periodo } : undefined);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getAsignacionesDocentes] Error:', error);
    return { success: false, data: [] };
  }
}

export async function saveAsignacionDocente(_periodo: string, _data: any) {
  try {
    const body = typeof _data === 'object' && _data !== null ? { periodo: _periodo, ..._data } : { periodo: _periodo, data: _data };
    const raw = await apiClient.post<any>(`${PTA_BASE}/asignaciones-docentes`, body);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][saveAsignacionDocente] Error:', error);
    return { success: false, data: null };
  }
}

export async function generarPTAsMasivos(_periodo: string, _data: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/masivo/generar-ptas`, { periodo: _periodo, ...(_data || {}) });
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][generarPTAsMasivos] Error:', error);
    return { success: false, data: null };
  }
}

export async function notificarDocentesMasivo(_periodo: string, _data: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/masivo/notificar-docentes`, { periodo: _periodo, ...(_data || {}) });
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][notificarDocentesMasivo] Error:', error);
    return { success: false, data: null };
  }
}

export async function getSyncProgramasStatus() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/sync/status`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getSyncProgramasStatus] Error:', error);
    return { success: false, data: null };
  }
}

export async function getSyncMappings() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/sync/mappings`);
    const normalized = normalizeResult<any>(raw, {});
    return { success: normalized.success, data: normalized.data || {} };
  } catch (error) {
    console.error('[mfe-pta][getSyncMappings] Error:', error);
    return { success: false, data: {} };
  }
}

export async function saveSyncMapping(_payload: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/sync/mappings`, _payload);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][saveSyncMapping] Error:', error);
    return { success: false, data: null };
  }
}

export async function bulkImportAsignaturas(_payload: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/sync/asignaturas/import`, _payload);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][bulkImportAsignaturas] Error:', error);
    return { success: false, data: null };
  }
}

export async function getExportAsignaturasUrl() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/sync/asignaturas/export-url`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getExportAsignaturasUrl] Error:', error);
    return { success: false, data: null };
  }
}

export async function getSyncAuditLog(_filters?: any) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/sync/audit-log`, _filters || undefined);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getSyncAuditLog] Error:', error);
    return { success: false, data: [] };
  }
}

export async function logSyncAuditEvent(_payload: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/sync/audit-log`, _payload);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][logSyncAuditEvent] Error:', error);
    return { success: false, data: null };
  }
}

export async function saveCustomAsignaturas(_payload: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/sync/asignaturas/custom`, _payload);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][saveCustomAsignaturas] Error:', error);
    return { success: false, data: null };
  }
}

export async function deleteCustomAsignatura(_id: string) {
  try {
    const raw = await apiClient.delete<any>(`${PTA_BASE}/sync/asignaturas/custom/${encodeURIComponent(_id)}`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][deleteCustomAsignatura] Error:', error);
    return { success: false, data: null };
  }
}

export async function getSyncHealth() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/sync/health`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getSyncHealth] Error:', error);
    return { success: false, data: null };
  }
}

export async function autoResolveSync() {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/sync/auto-resolve`, undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][autoResolveSync] Error:', error);
    return { success: false, data: null };
  }
}

export async function validateSync() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/sync/validate`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][validateSync] Error:', error);
    return { success: false, data: null };
  }
}

export async function getChangeAlerts() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/sync/change-alerts`);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getChangeAlerts] Error:', error);
    return { success: false, data: [] };
  }
}

export async function dismissChangeAlerts(_ids: string[] | any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/sync/change-alerts/dismiss`, { ids: _ids });
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][dismissChangeAlerts] Error:', error);
    return { success: false, data: null };
  }
}

export async function getHealthHistory(_filters?: any) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/sync/health/history`, _filters || undefined);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getHealthHistory] Error:', error);
    return { success: false, data: [] };
  }
}

export async function getReconciliationPreview(_payload?: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/reconciliation/preview`, _payload);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getReconciliationPreview] Error:', error);
    return { success: false, data: null };
  }
}

export async function applyReconciliation(_payload?: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/reconciliation/apply`, _payload);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][applyReconciliation] Error:', error);
    return { success: false, data: null };
  }
}

export async function recordHealthHistory() {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/sync/health/history`, undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][recordHealthHistory] Error:', error);
    return { success: false, data: null };
  }
}

export async function getPTANotificationPreferences(_userId?: string, _rol?: string) {
  try {
    const params: Record<string, string> = {};
    if (_userId) params.user_id = _userId;
    if (_rol) params.rol = _rol;
    const raw = await apiClient.get<any>(`${PTA_BASE}/notifications/preferences`, Object.keys(params).length ? params : undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][getPTANotificationPreferences] Error:', error);
    return { success: false, data: null };
  }
}

export async function savePTANotificationPreferences(_payload: any) {
  try {
    const raw = await apiClient.put<any>(`${PTA_BASE}/notifications/preferences`, _payload);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][savePTANotificationPreferences] Error:', error);
    return { success: false, data: null };
  }
}

export async function getPTAUnifiedNotificationHistory(_filters?: any) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/notifications/history/unified`, _filters || undefined);
    const normalized = normalizeResult<any>(raw, null);
    const data = normalized.data as any;
    return { success: normalized.success, data: data ?? { notifications: [], stats: {} } };
  } catch (error) {
    console.error('[mfe-pta][getPTAUnifiedNotificationHistory] Error:', error);
    return { success: false, data: { notifications: [], stats: {} } };
  }
}

export async function getDismissedAlerts(_userId?: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/reportes/alertas-dismissed`, _userId ? { user_id: _userId } : undefined);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getDismissedAlerts] Error:', error);
    return { success: false, data: [] };
  }
}

export async function saveDismissedAlerts(_payload: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/reportes/alertas-dismissed`, _payload);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][saveDismissedAlerts] Error:', error);
    return { success: false, data: null };
  }
}

export async function getReportSchedules(_filters?: any) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/reportes/schedules`, _filters || undefined);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getReportSchedules] Error:', error);
    return { success: false, data: [] };
  }
}

export async function saveReportSchedule(_payload: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/reportes/schedules`, _payload);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][saveReportSchedule] Error:', error);
    return { success: false, data: null };
  }
}

export async function deleteReportSchedule(_scheduleId: string) {
  try {
    const raw = await apiClient.delete<any>(`${PTA_BASE}/reportes/schedules/${encodeURIComponent(_scheduleId)}`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][deleteReportSchedule] Error:', error);
    return { success: false, data: null };
  }
}

export async function toggleReportSchedule(_scheduleId: string, _enabled: boolean) {
  try {
    const raw = await apiClient.patch<any>(`${PTA_BASE}/reportes/schedules/${encodeURIComponent(_scheduleId)}/toggle`, {
      enabled: _enabled,
    });
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][toggleReportSchedule] Error:', error);
    return { success: false, data: null };
  }
}

export async function executeScheduler(_payload?: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/reportes/scheduler/execute`, _payload || {});
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][executeScheduler] Error:', error);
    return { success: false, data: null };
  }
}

export async function executeSingleSchedule(_scheduleId: string) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/reportes/scheduler/execute/${encodeURIComponent(_scheduleId)}`, undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][executeSingleSchedule] Error:', error);
    return { success: false, data: null };
  }
}

export async function getSchedulerHistory(_filters?: any) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/reportes/scheduler/history`, _filters || undefined);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getSchedulerHistory] Error:', error);
    return { success: false, data: [] };
  }
}

export async function clearSchedulerHistory() {
  try {
    const raw = await apiClient.delete<any>(`${PTA_BASE}/reportes/scheduler/history`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][clearSchedulerHistory] Error:', error);
    return { success: false, data: null };
  }
}

export async function getPTASyncStatus(signal?: AbortSignal) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/sync/status`, undefined, { signal });
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      console.warn('[mfe-pta][getPTASyncStatus] Error:', error?.message || error);
    }
    return { success: false, data: null, _networkError: true };
  }
}

export async function getPTARecentEvents(since?: string, docenteId?: string, signal?: AbortSignal) {
  try {
    const params: Record<string, string> = {};
    if (since) params.since = since;
    if (docenteId) params.docente_id = docenteId;
    const raw = await apiClient.get<any>(`${PTA_BASE}/events/recent`, params, { signal });
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error: any) {
    if (error?.name !== 'AbortError') {
      console.warn('[mfe-pta][getPTARecentEvents] Error:', error?.message || error);
    }
    return { success: false, data: null };
  }
}

export async function markPTAEventsRead(eventIds: string[], sistema: 'backoffice' | 'portal') {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/events/mark-read`, {
      event_ids: eventIds,
      sistema,
    });
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][markPTAEventsRead] Error:', error);
    return { success: false };
  }
}

export async function agregarComentarioConcertacion(
  ptaId: string,
  data: { autor: string; autor_rol: string; mensaje: string },
) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${ptaId}/concertacion/comentario`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][agregarComentarioConcertacion] Error:', error);
    return { success: false };
  }
}

export async function cerrarConcertacion(ptaId: string, data: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${ptaId}/concertacion/cerrar`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][cerrarConcertacion] Error:', error);
    return { success: false };
  }
}

export async function escalarConcertacion(ptaId: string, data: { motivo: string; escalado_por?: string }) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${ptaId}/concertacion/escalar`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][escalarConcertacion] Error:', error);
    return { success: false };
  }
}

export async function enviarAprobacionPTA(ptaId: string, data?: { enviado_por?: string }) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${ptaId}/enviar-aprobacion`, data || {});
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][enviarAprobacionPTA] Error:', error);
    return { success: false };
  }
}

export async function getMisSolicitudesPTA(docenteId: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/solicitudes/docente/${docenteId}`);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][getMisSolicitudesPTA] Error:', error);
    return { success: false, data: [] };
  }
}

export async function marcarSolicitudLeida(solicitudId: string) {
  try {
    const raw = await apiClient.patch<any>(`${PTA_BASE}/solicitudes/${solicitudId}/leida`, undefined);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('[mfe-pta][marcarSolicitudLeida] Error:', error);
    return { success: false };
  }
}

export async function crearSolicitudPTA(payload: any) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/solicitudes`, payload);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data, message: (raw as any)?.message };
  } catch (error) {
    console.error('[mfe-pta][crearSolicitudPTA] Error:', error);
    return { success: false, message: 'No se pudo crear la solicitud' };
  }
}

export async function uploadSolicitudFiles(files: File[]) {
  try {
    const formData = new FormData();
    for (const file of files) {
      formData.append('files', file);
    }

    // Usamos `upload` del ApiClient (XMLHttpRequest) para multipart/form-data.
    const raw = await (apiClient as any).upload<any>(`${PTA_BASE}/solicitudes/upload`, formData);
    const normalized = normalizeResult<any[]>(raw, []);
    return { success: normalized.success, data: Array.isArray(normalized.data) ? normalized.data : [] };
  } catch (error) {
    console.error('[mfe-pta][uploadSolicitudFiles] Error:', error);
    return { success: false, data: [] };
  }
}

// --- MIGRADOS DESDE EL REPO ANTERIOR ---
export async function getPTAsPendientes() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/pendientes`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error in getPTAsPendientes:', error);
    return { success: false, data: [] };
  }
}

export async function getCatalogoTiposVinculacion() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/tipos-vinculacion`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error fetching tipos vinculacion:', error);
    return { success: false, data: [] };
  }
}

export async function calcularHorasProgramablesTipoVinculacion(data: {
  tipo_vinculacion: string;
  dedicacion: string;
  semanas_vinculacion?: number;
}) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/catalogos/calcular-horas-programables`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error calculating horas programables:', error);
    return { success: false, data: null };
  }
}

export async function getCatalogoAulas() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/aulas`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error fetching aulas:', error);
    return { success: false, data: [] };
  }
}

export async function getCatalogoEstadosCircular() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/catalogos/estados-circular`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error fetching estados circular:', error);
    return { success: false, data: {} };
  }
}

export async function editarComponentesPorRevisor(ptaId: string, data: {
  actorId?: string;
  actorRol?: string;
  observaciones?: string;
  nuevos_totales?: {
    docencia?: number;
    investigacion?: number;
    extension?: number;
    complementarias?: number;
    academico_admin?: number;
  };
}) {
  try {
    const raw = await apiClient.patch<any>(`${PTA_BASE}/${ptaId}/componentes`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error in editarComponentesPorRevisor:', error);
    return { success: false };
  }
}

// ═══ Seed: Inicializar datos demo ═══════════════════════════════════

export async function sendPTAEmailNotification(data: {
  docente_id: string;
  docente_nombre?: string;
  evento: string;
  estado_nuevo: string;
  pta_id: string;
  actor?: string;
  mensaje?: string;
}) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/notifications/email`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error sending email notification:', error);
    return { success: false };
  }
}

export async function getPTABellNotifications(docenteId?: string, unreadOnly = false) {
  try {
    const params = new URLSearchParams();
    if (docenteId) params.set('docente_id', docenteId);
    if (unreadOnly) params.set('unread_only', 'true');
    const raw = await apiClient.get<any>(`${PTA_BASE}/notifications/bell?${params.toString()}`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error fetching bell notifications:', error);
    return { success: false, data: { notifications: [], total: 0, unread_count: 0 } };
  }
}

export async function markPTABellNotificationsRead(notificationIds: string[]) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/notifications/bell/mark-read`, { notification_ids: notificationIds });
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error marking bell notifications read:', error);
    return { success: false };
  }
}

export async function getPTAEmailHistory(docenteId?: string) {
  try {
    const params = new URLSearchParams();
    if (docenteId) params.set('docente_id', docenteId);
    const raw = await apiClient.get<any>(`${PTA_BASE}/notifications/email/history?${params.toString()}`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error fetching email history:', error);
    return { success: false, data: { emails: [], total: 0 } };
  }
}

// ═══ Preferencias de Notificación ═══════════════════════════════════

export async function verificarFirmaDigitalPTA(certificadoId: string) {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/verificar/${encodeURIComponent(certificadoId)}`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error verifying PTA firma digital:', error);
    return { success: false, data: null };
  }
}

export async function webhookProgramaChange(data: { event: string; programa_id?: string; programa_nombre?: string; actor?: string; periodo?: string }) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/sync/webhook/programa-change`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error in webhook:', error);
    return { success: false };
  }
}

export async function cargaMasivaDocentes(data: { registros: any[]; periodo: string }) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/carga-masiva/docentes`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error bulk loading docentes:', error);
    return { success: false };
  }
}

export async function getHistorialCargas() {
  try {
    const raw = await apiClient.get<any>(`${PTA_BASE}/carga-masiva/historial`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error fetching carga historial:', error);
    return { success: false, data: [] };
  }
}

// ═══ Alertas: Persistencia de alertas descartadas ════════════════════

export async function solicitarAprobacionSNI(ptaId: string, data: {
  rol?: string; proyecto_nombre?: string; proyecto_codigo?: string;
  grupo?: string; horas_solicitadas: number; justificacion?: string;
  solicitado_por?: string;
}) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${ptaId}/solicitud-sni`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error creating SNI solicitud:', error);
    return { success: false };
  }
}

export async function solicitarAprobacionSNPI(ptaId: string, data: {
  direccion: string; actividades?: any[]; horas_solicitadas: number;
  justificacion?: string; solicitado_por?: string;
}) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${ptaId}/solicitud-snpi`, data);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error creating SNPI solicitud:', error);
    return { success: false };
  }
}

export async function getAlertasTemporalesPTA(periodo?: string) {
  try {
    const params = periodo ? `?periodo=${periodo}` : '';
    const raw = await apiClient.get<any>(`${PTA_BASE}/alertas-temporales${params}`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error fetching alertas temporales:', error);
    return { success: false, data: { alertas: [], total_alertas: 0 } };
  }
}

// ═══ Referencias Normativas — Tooltips (Circular 003) ════════════════

export async function getReferenciasNormativas(seccion?: string) {
  try {
    const params = seccion ? `?seccion=${seccion}` : '';
    const raw = await apiClient.get<any>(`${PTA_BASE}/referencias-normativas${params}`);
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error) {
    console.error('Error fetching referencias normativas:', error);
    return { success: false, data: {} };
  }
}

// ═══ Integración RUND ↔ PTA (Carpeta Digital, Obs. #5, §13.5) ═══════

export async function enviarPropuestaDocente(ptaId: string, observaciones: string) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${ptaId}/enviar-propuesta`, { observaciones });
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function respuestaConcertacionDocente(ptaId: string, aceptaPropuesta: boolean, observaciones: string) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/${ptaId}/respuesta-docente`, { aceptaPropuesta, observaciones });
    const normalized = normalizeResult<any>(raw, null);
    return { success: normalized.success, data: normalized.data };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function syncRUNDDocuments(docenteId: string, documentos: any[]) {
  try {
    const raw = await apiClient.post<any>(`${PTA_BASE}/rund/docente/${docenteId}/sync-documents`, { documentos });
    return normalizeResult<any>(raw, null);
  } catch (error: any) {
    console.error('Error syncing RUND checklist with Carpeta Digital:', error);
    return { success: false };
  }
}

// ═══ Banco de Docentes ════════════════════════════════════════════════

const BD_BASE = `${SERVICE_BASE}/pta/banco-docentes`;

export async function getBancoDocentes(filters?: {
  territorial?: string;
  dedicacion?: string;
  estado?: string;
  search?: string;
  page?: number;
  limit?: number;
  periodoCarga?: string;
}) {
  try {
    // El backend devuelve { success, items:[...], total, pages } sin wrapper "data"
    // para que el apiClient no desenvuelva y descarte la paginación.
    const raw = await apiClient.get<any>(BD_BASE, filters);
    const r = raw && typeof raw === 'object' ? raw : {};
    const items = Array.isArray(r.items) ? r.items : (Array.isArray(r.data) ? r.data : (Array.isArray(raw) ? raw : []));
    return { success: true, data: { data: items, total: r.total ?? items.length, page: r.page ?? 1, pages: r.pages ?? 1 } };
  } catch (error) {
    console.error('[mfe-pta][getBancoDocentes] Error:', error);
    return { success: false, data: { data: [], total: 0, page: 1, limit: 50, pages: 1 } };
  }
}

export async function getBancoDocenteStats(filters?: { territorial?: string; dedicacion?: string; estado?: string; periodoCarga?: string }) {
  try {
    const params = new URLSearchParams();
    if (filters?.territorial) params.set('territorial', filters.territorial);
    if (filters?.dedicacion) params.set('dedicacion', filters.dedicacion);
    if (filters?.estado) params.set('estado', filters.estado);
    if (filters?.periodoCarga) params.set('periodoCarga', filters.periodoCarga);
    const qs = params.toString() ? `?${params.toString()}` : '';
    const raw = await apiClient.get<any>(`${BD_BASE}/stats${qs}`);
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-pta][getBancoDocenteStats] Error:', error);
    return { success: false, data: null };
  }
}

export async function getBancoDocenteById(id: string) {
  try {
    const raw = await apiClient.get<any>(`${BD_BASE}/${id}`);
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.warn('[mfe-pta][getBancoDocenteById] No encontrado o error al buscar docente:', error instanceof Error ? error.message : error);
    return { success: false, data: null };
  }
}

export async function createBancoDocente(body: any) {
  try {
    const raw = await apiClient.post<any>(BD_BASE, body);
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-pta][createBancoDocente] Error:', error);
    return { success: false, data: null };
  }
}

export async function updateBancoDocente(id: string, body: any) {
  try {
    const raw = await apiClient.put<any>(`${BD_BASE}/${id}`, body);
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-pta][updateBancoDocente] Error:', error);
    return { success: false, data: null };
  }
}

export async function toggleBancoDocenteEstado(id: string) {
  try {
    const raw = await apiClient.delete<any>(`${BD_BASE}/${id}`);
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-pta][toggleBancoDocenteEstado] Error:', error);
    return { success: false, data: null };
  }
}

export async function bulkUploadBancoDocentes(file: File, dryRun = false, omitErrors = false, periodoCarga?: string) {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const query = new URLSearchParams();
    if (dryRun) query.append('dry_run', 'true');
    if (omitErrors) query.append('omit_errors', 'true');
    if (periodoCarga) query.append('periodo_carga', periodoCarga);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const raw = await apiClient.upload<any>(`${BD_BASE}/bulk${queryString}`, formData, { timeoutMs: 300000 });
    return normalizeResult<any>(raw, null);
  } catch (error: any) {
    const msg = error?.response?.data?.message || error?.message || 'Error en la carga masiva';
    return { success: false, data: null, error: msg };
  }
}

export async function exportBancoDocentes(): Promise<Blob> {
  const baseUrl = (apiClient as any).baseURL || '';
  const res = await fetch(`${baseUrl}${BD_BASE}/export`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Error al exportar');
  return res.blob();
}

export async function downloadBancoDocentesTemplate(): Promise<Blob> {
  const baseUrl = (apiClient as any).baseURL || '';
  const res = await fetch(`${baseUrl}${BD_BASE}/template`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Plantilla no disponible');
  return res.blob();
}

// ═══ RUND — Aprobación por bloques (BR-038..BR-061) ═══════════════════

/** BR-044 — Obtener estados de aprobación por bloque */
export async function getRundBloques(docenteId: string) {
  try {
    const raw = await apiClient.get<any>(`${BD_BASE}/${docenteId}/bloques`);
    return normalizeResult<any[]>(raw, []);
  } catch (error) {
    console.error('[mfe-pta][getRundBloques] Error:', error);
    return { success: false, data: [] };
  }
}

/** BR-059 — Obtener tarjeta RUND completa (bloques + soportes + semáforo) */
export async function getTarjetaRUND(docenteId: string) {
  try {
    const raw = await apiClient.get<any>(`${BD_BASE}/${docenteId}/tarjeta-rund`);
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-pta][getTarjetaRUND] Error:', error);
    return { success: false, data: null };
  }
}

/** BR-043 — Aprobar un bloque (maker-checker) */
export async function aprobarRundBloque(docenteId: string, bloque: string, aprobadorId: string) {
  try {
    const raw = await apiClient.post<any>(`${BD_BASE}/${docenteId}/bloques/${bloque}/aprobar`, { aprobadorId });
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-pta][aprobarRundBloque] Error:', error);
    return { success: false, data: null };
  }
}

/** BR-045 — Devolver un bloque con observación obligatoria */
export async function devolverRundBloque(docenteId: string, bloque: string, aprobadorId: string, observacion: string) {
  try {
    const raw = await apiClient.post<any>(`${BD_BASE}/${docenteId}/bloques/${bloque}/devolver`, { aprobadorId, observacion });
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-pta][devolverRundBloque] Error:', error);
    return { success: false, data: null };
  }
}

/** BR-039 — Vincular un soporte a un bloque */
export async function vincularRundSoporte(docenteId: string, bloque: string, data: {
  tipoSoporte: string;
  documentoCarpetaId?: string;
  nombreArchivo?: string;
  fechaVencimiento?: string;
  cargadoPor?: string;
}, file?: File) {
  try {
    if (file) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tipoSoporte', data.tipoSoporte);
      if (data.documentoCarpetaId) formData.append('documentoCarpetaId', data.documentoCarpetaId);
      if (data.nombreArchivo) formData.append('nombreArchivo', data.nombreArchivo);
      if (data.fechaVencimiento) formData.append('fechaVencimiento', data.fechaVencimiento);
      if (data.cargadoPor) formData.append('cargadoPor', data.cargadoPor);
      
      const raw = await (apiClient as any).upload<any>(`${BD_BASE}/${docenteId}/bloques/${bloque}/soportes`, formData);
      return normalizeResult<any>(raw, null);
    } else {
      const raw = await apiClient.post<any>(`${BD_BASE}/${docenteId}/bloques/${bloque}/soportes`, data);
      return normalizeResult<any>(raw, null);
    }
  } catch (error) {
    console.error('[mfe-pta][vincularRundSoporte] Error:', error);
    return { success: false, data: null };
  }
}

/** BR-052 — Validar unicidad de documento y correo */
export async function validarUnicidadRund(documentNumber: string, correoInstitucional: string, excludeDocenteId?: string) {
  try {
    const raw = await apiClient.post<any>(`${BD_BASE}/validar-unicidad`, { documentNumber, correoInstitucional, excludeDocenteId });
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-pta][validarUnicidadRund] Error:', error);
    return { success: false, data: null };
  }
}

/** BR-053 — Detectar posible duplicado */
export async function detectarDuplicadoRund(nombreCompleto: string, fechaNacimiento: string) {
  try {
    const raw = await apiClient.post<any>(`${BD_BASE}/detectar-duplicado`, { nombreCompleto, fechaNacimiento });
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-pta][detectarDuplicadoRund] Error:', error);
    return { success: false, data: null };
  }
}

/** BR-047 — Verificar activación */
export async function verificarActivacionRund(docenteId: string) {
  try {
    const raw = await apiClient.get<any>(`${BD_BASE}/${docenteId}/activacion`);
    return normalizeResult<any>(raw, null);
  } catch (error) {
    console.error('[mfe-pta][verificarActivacionRund] Error:', error);
    return { success: false, data: null };
  }
}

/** BR-055 — Soportes próximos a vencer */
export async function getSoportesProximosVencer(dias = 30) {
  try {
    const raw = await apiClient.get<any>(`${BD_BASE}/soportes/proximos-vencer`, { dias: String(dias) });
    return normalizeResult<any[]>(raw, []);
  } catch (error) {
    console.error('[mfe-pta][getSoportesProximosVencer] Error:', error);
    return { success: false, data: [] };
  }
}



/**
 * BR-056 — Obtener historial de auditoría inmutable de un docente.
 */
export async function getAuditoriaRUND(docenteId: string) {
  try {
    const raw = await apiClient.get<any>(`${BD_BASE}/${docenteId}/auditoria`);
    return normalizeResult<any[]>(raw, []);
  } catch (error) {
    console.error('[mfe-pta][getAuditoriaRUND] Error:', error);
    return { success: false, data: [] };
  }
}

// ═══ Solicitudes PTA — Segundo PTA ═══════════════════════════════════

