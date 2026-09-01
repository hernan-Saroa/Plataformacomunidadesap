import apiClient from './apiClient';
import {
  SolicitudViatico,
  ResumenEstadisticoViaticos,
  Comisionado,
  CreateSolicitudRequest,
  SolicitudComisionResponse,
  DocumentoSoporte,
  SolicitudListaResponse,
  EstadoSolicitudViatico,
  Geopolitica,
   ChecklistDocumentosResponse,
   FinalizarSolicitudResponse,
 } from '../../types/viaticos';
import {
  ParametrizacionFormulario,
  ConfigTipoComisionado,
  CampoFormulario,
  TipoDocumentoSoporte,
  CrearCampoFormularioDTO,
  ActualizarCampoFormularioDTO,
  CrearConfigTipoComisionadoDTO,
  ActualizarConfigTipoComisionadoDTO,
} from '../../types/parametrizacion';
import { fallbackGeopolitica, formatearNombreComisionado } from '../../utils/viaticosUtils';

/**
 * Extrae la lista de geopolítica de la respuesta del API de forma robusta.
 * El auth-service envuelve con { success, data: { data: [...] }, timestamp },
 * por lo que la lista puede estar en `res.data.data`, `res.data` o `res` como
 * array directo (según el cliente HTTP o el gateway).
 */
function extraerListaGeopolitica(res: unknown): Geopolitica[] {
  if (Array.isArray(res)) {
    return res as Geopolitica[];
  }
  if (!res || typeof res !== 'object') {
    return [];
  }
  const obj = res as Record<string, unknown>;
  if (Array.isArray(obj.data)) {
    return obj.data as Geopolitica[];
  }
  const nested = obj.data as Record<string, unknown> | undefined;
  if (nested && Array.isArray(nested.data)) {
    return nested.data as Geopolitica[];
  }
  return [];
}

function esSuperAdminFromResponse(res: unknown): boolean {
  if (!res || typeof res !== 'object') return false;
  const obj = res as Record<string, unknown>;

  if (typeof obj.esSuperAdmin === 'boolean') {
    console.log('[viaticos] esSuperAdminFromResponse root esSuperAdmin=', obj.esSuperAdmin);
    return obj.esSuperAdmin;
  }

  const nested = obj.data as Record<string, unknown> | undefined;
  if (nested && typeof nested === 'object' && typeof nested.esSuperAdmin === 'boolean') {
    console.log('[viaticos] esSuperAdminFromResponse nested esSuperAdmin=', nested.esSuperAdmin);
    return nested.esSuperAdmin;
  }

  console.log('[viaticos] esSuperAdminFromResponse no encontrado,=false');
  return false;
}

function extraerSolicitudes(res: unknown): { data: SolicitudListaResponse[]; esSuperAdmin: boolean } {
  if (!res || typeof res !== 'object') {
    console.log('[viaticos] extraerSolicitudes: respuesta vacía o no objeto');
    return { data: [], esSuperAdmin: false };
  }

  const esSuperAdmin = esSuperAdminFromResponse(res);

  const arr = encontrarArraySolicitudes(res);
  console.log('[viaticos] extraerSolicitudes: array encontrado?', Array.isArray(arr), 'length=', Array.isArray(arr) ? arr.length : 'n/a');

  if (Array.isArray(arr)) {
    return { data: arr as SolicitudListaResponse[], esSuperAdmin };
  }

  return { data: [], esSuperAdmin };
}

function encontrarArraySolicitudes(valor: unknown): unknown[] | null {
  if (Array.isArray(valor)) {
    console.log('[viaticos] encontrarArraySolicitudes: array directo length=', valor.length);
    return valor;
  }

  if (!valor || typeof valor !== 'object') {
    return null;
  }

  const obj = valor as Record<string, unknown>;

  if (Array.isArray(obj.data)) {
    console.log('[viaticos] encontrarArraySolicitudes: obj.data length=', obj.data.length);
    return obj.data;
  }

  const nested = obj.data as Record<string, unknown> | undefined;
  if (nested && typeof nested === 'object') {
    const candidato = encontrarArraySolicitudes(nested);
    if (candidato) return candidato;
  }

  for (const key of Object.keys(obj)) {
    if (key === 'data' || key === 'timestamp' || key === 'success') {
      continue;
    }
    const candidato = encontrarArraySolicitudes(obj[key]);
    if (candidato) {
      console.log('[viaticos] encontrarArraySolicitudes: encontrado en key=', key, 'length=', candidato.length);
      return candidato;
    }
  }

  console.log('[viaticos] encontrarArraySolicitudes: no encontrado');
  return null;
}

export class ViaticosService {
  /**
   * Mapea una solicitud del backend (GET /solicitudes) al modelo de presentación.
   */
  private mapearSolicitudLista(s: SolicitudListaResponse): SolicitudViatico {
    const montoViaticos = Number(s.montoViaticos || 0);
    const montoGastosViaje = Number(s.montoGastosViaje || 0);
    return {
      id: s.id,
      codigo: s.consecutivoUnico,
      cedulaComisionado: s.comisionado?.numeroDocumento || '',
      nombreComisionado: s.comisionado
        ? formatearNombreComisionado(s.comisionado as Comisionado)
        : 'Comisionado',
      cargoComisionado: s.comisionado?.tipoComisionado || '',
      dependencia: '',
      sedeOrigen: '',
      ciudadDestino: s.destinoCiudad,
      departamentoDestino: s.destinoDepartamento,
      fechaInicio: s.fechaInicio.slice(0, 10),
      fechaFin: s.fechaFin.slice(0, 10),
      diasComision: s.diasComision || 1,
      tipoComision: 'SERVICIOS_INSTITUCIONALES',
      medioTransporte: s.requiereTiquetes ? 'AEREO' : 'TERRESTRE',
      justificacion: s.objetoComision,
      montoSolicitadoViaticos: montoViaticos,
      montoSolicitadoGastosViaje: montoGastosViaje,
      montoTotalEstimado: montoViaticos + montoGastosViaje,
      estado: (s.estadoSolicitud || 'RADICADA') as EstadoSolicitudViatico,
      extemporanea: Boolean(s.extemporanea),
      radicadoFueraJornada: Boolean(s.radicadoFueraJornada),
      requiereTiqueteAereo: s.requiereTiquetes,
      creadoEn: s.creadoEn.slice(0, 10),
      actualizadoEn: s.actualizadoEn.slice(0, 10),
      esCreadoPorMi: s.esCreadoPorMi,
    };
  }

  async obtenerSolicitudes(): Promise<{ solicitudes: SolicitudViatico[]; esSuperAdmin: boolean }> {
    try {
      const timestamp = Date.now();
      const response = await apiClient.get<unknown>(`/viaticos/api/v1/solicitudes?t=${timestamp}`);
      const responseKeys = Object.keys(response as any);
      console.log('[viaticos] obtenerSolicitudes raw response type=', typeof response, 'keys=', responseKeys, 'value=', JSON.stringify(response));
      const { data, esSuperAdmin } = extraerSolicitudes(response);
      console.log('[viaticos] obtenerSolicitudes parsed count=', data.length, 'esSuperAdmin=', esSuperAdmin);
      if (data.length === 0) {
        console.warn('[viaticos] obtenerSolicitudes: no se pudieron extraer solicitudes de la respuesta', response);
      }
      const solicitudes = data.map((item) => this.mapearSolicitudLista(item));
      return { solicitudes, esSuperAdmin };
    } catch (error) {
      console.error('[viaticos] obtenerSolicitudes error=', error);
      return { solicitudes: [], esSuperAdmin: false };
    }
  }

  async obtenerResumenEstadistico(): Promise<ResumenEstadisticoViaticos> {
    const { solicitudes } = await this.obtenerSolicitudes();
    return {
      totalSolicitudes: solicitudes.length,
      enProcesoAprobacion: solicitudes.filter((s) =>
        ['SOLICITADO', 'APROBADO_JEFE', 'APROBADO_TALENTO_HUMANO'].includes(s.estado),
      ).length,
      enComisionActivas: solicitudes.filter((s) => s.estado === 'EN_COMISION').length,
      pendientesLegalizar: solicitudes.filter((s) => s.estado === 'PENDIENTE_LEGALIZACION').length,
      borradores: solicitudes.filter((s) => s.estado === 'PENDIENTE' || s.estado === 'BORRADOR').length,
      montoTotalEjecutado: solicitudes.reduce((acc, curr) => acc + curr.montoTotalEstimado, 0),
    };
  }

  /**
   * Consulta los departamentos de geopolítica en el microservicio de auth
   * (`auth.geopolitica`). Si no está disponible, usa el catálogo estático.
   */
  async obtenerDepartamentos(): Promise<Geopolitica[]> {
    try {
      const res = await apiClient.get<unknown>(
        '/auth/api/v1/estructura-organizacional/geopolitica/departamentos',
      );
      // El API devuelve { success, data: { data: [...] }, timestamp }; se extrae
      // la lista de forma robusta (res.data.data | res.data | res como array).
      const lista = extraerListaGeopolitica(res);
      if (lista.length > 0) {
        return lista;
      }
    } catch (error) {
      console.warn('[viaticos] geopolítica auth no disponible, usando catálogo local:', error);
    }
    return fallbackGeopolitica().filter((g) => g.tipDivision === 'DEPTO');
  }

  /**
   * Consulta las ciudades de un departamento en el microservicio de auth
   * (`auth.geopolitica`). Si no está disponible, usa el catálogo estático.
   */
  async obtenerCiudadesPorDepartamento(idDepartamento: number): Promise<Geopolitica[]> {
    try {
      const res = await apiClient.get<unknown>(
        `/auth/api/v1/estructura-organizacional/geopolitica/departamentos/${idDepartamento}/ciudades`,
      );
      // Misma forma de respuesta que los departamentos: { success, data: { data: [...] } }.
      const lista = extraerListaGeopolitica(res);
      if (lista.length > 0) {
        return lista;
      }
    } catch (error) {
      console.warn('[viaticos] geopolítica auth no disponible, usando catálogo local:', error);
    }
    return fallbackGeopolitica().filter(
      (g) => g.tipDivision === 'CIUDAD' && g.codDepartamento === idDepartamento,
    );
  }

  async consultarComisionado(documento: string): Promise<Comisionado | null> {
    try {
      return await apiClient.get<Comisionado>(`/viaticos/api/v1/comisionados/${documento}`);
    } catch {
      return null;
    }
  }

  async obtenerParametrizacionFormulario(): Promise<ParametrizacionFormulario> {
    try {
      return await apiClient.get<ParametrizacionFormulario>('/viaticos/api/v1/parametrizacion/formulario');
    } catch (error) {
      console.error('Error obteniendo parametrización del formulario:', error);
      return { campos: [], configuraciones: {} };
    }
  }

  async obtenerParametrizacionPorCodigoFormulario(codigo: string): Promise<ConfigTipoComisionado | null> {
    try {
      return await apiClient.get<ConfigTipoComisionado>(`/viaticos/api/v1/parametrizacion/formulario/${encodeURIComponent(codigo)}`);
    } catch (error) {
      console.error('Error obteniendo parametrización por código:', error);
      return null;
    }
  }

  async validarDocumentosRequeridos(tipoComisionado: string, tiposDocumentos: string[]): Promise<string[]> {
    try {
      const params = new URLSearchParams();
      params.set('tipo', tipoComisionado);
      if (tiposDocumentos.length > 0) {
        params.set('documentos', tiposDocumentos.join(','));
      }
      const response = await apiClient.get<{ faltantes: string[] }>(`/viaticos/api/v1/parametrizacion/validar-documentos?${params.toString()}`);
      return response.faltantes || [];
    } catch (error) {
      console.error('Error validando documentos requeridos:', error);
      return [];
    }
  }

  async validarCamposObligatorios(tipoComisionado: string, datosCampos: Record<string, any>): Promise<string[]> {
    try {
      const camposQuery = Object.entries(datosCampos)
        .map(([clave, valor]) => `${clave}=${encodeURIComponent(valor || '')}`)
        .join(',');
      const params = new URLSearchParams();
      params.set('tipo', tipoComisionado);
      if (camposQuery) {
        params.set('campos', camposQuery);
      }
      const response = await apiClient.get<{ camposFaltantes: string[] }>(`/viaticos/api/v1/parametrizacion/validar-campos?${params.toString()}`);
      return response.camposFaltantes || [];
    } catch (error) {
      console.error('Error validando campos obligatorios:', error);
      return [];
    }
  }

  async obtenerConfiguracionPorTipo(tipoComisionado: string): Promise<ConfigTipoComisionado | null> {
    try {
      return await apiClient.get<ConfigTipoComisionado>(`/viaticos/api/v1/parametrizacion/config-tipo-comisionado/${encodeURIComponent(tipoComisionado)}`);
    } catch (error) {
      console.error('Error obteniendo configuración por tipo:', error);
      return null;
    }
  }

  async obtenerTodasConfiguraciones(): Promise<ConfigTipoComisionado[]> {
    try {
      return await apiClient.get<ConfigTipoComisionado[]>('/viaticos/api/v1/parametrizacion/config-tipo-comisionado');
    } catch (error) {
      console.error('Error obteniendo todas las configuraciones:', error);
      return [];
    }
  }

  async obtenerCamposFormulario(): Promise<CampoFormulario[]> {
    try {
      return await apiClient.get<CampoFormulario[]>('/viaticos/api/v1/parametrizacion/campos-formulario');
    } catch (error) {
      console.error('Error obteniendo campos del formulario:', error);
      return [];
    }
  }

  async obtenerTiposDocumentoSoporte(): Promise<TipoDocumentoSoporte[]> {
    try {
      return await apiClient.get<TipoDocumentoSoporte[]>('/viaticos/api/v1/parametrizacion/tipos-documento-soporte');
    } catch (error) {
      console.error('Error obteniendo tipos de documento soporte:', error);
      return [];
    }
  }

  async crearCampoFormulario(dto: CrearCampoFormularioDTO): Promise<CampoFormulario | null> {
    try {
      return await apiClient.post<CampoFormulario>('/viaticos/api/v1/parametrizacion/campos-formulario', dto);
    } catch (error) {
      console.error('Error creando campo del formulario:', error);
      throw error;
    }
  }

  async actualizarCampoFormulario(clave: string, dto: ActualizarCampoFormularioDTO): Promise<CampoFormulario | null> {
    try {
      return await apiClient.put<CampoFormulario>(`/viaticos/api/v1/parametrizacion/campos-formulario/${encodeURIComponent(clave)}`, dto);
    } catch (error) {
      console.error('Error actualizando campo del formulario:', error);
      throw error;
    }
  }

  async eliminarCampoFormulario(clave: string): Promise<void> {
    try {
      await apiClient.delete(`/viaticos/api/v1/parametrizacion/campos-formulario/${encodeURIComponent(clave)}`);
    } catch (error) {
      console.error('Error eliminando campo del formulario:', error);
      throw error;
    }
  }

  async crearConfigTipoComisionado(dto: CrearConfigTipoComisionadoDTO): Promise<ConfigTipoComisionado | null> {
    try {
      return await apiClient.post<ConfigTipoComisionado>('/viaticos/api/v1/parametrizacion/config-tipo-comisionado', dto);
    } catch (error) {
      console.error('Error creando configuración de tipo comisionado:', error);
      throw error;
    }
  }

  async actualizarConfigTipoComisionado(tipo: string, dto: ActualizarConfigTipoComisionadoDTO): Promise<ConfigTipoComisionado | null> {
    try {
      return await apiClient.put<ConfigTipoComisionado>(`/viaticos/api/v1/parametrizacion/config-tipo-comisionado/${encodeURIComponent(tipo)}`, dto);
    } catch (error) {
      console.error('Error actualizando configuración de tipo comisionado:', error);
      throw error;
    }
  }

  extraerDocumentosRequeridos(config: ConfigTipoComisionado | null): { obligatorios: TipoDocumentoSoporte[]; opcionales: TipoDocumentoSoporte[] } {
    if (!config || !config.documentos) {
      return { obligatorios: [], opcionales: [] };
    }

    const obligatorios = config.documentos
      .filter((d) => d.tipoRequisito === 'OBLIGATORIO')
      .map((d) => d.tipoDocumentoSoporte)
      .filter((doc): doc is TipoDocumentoSoporte => Boolean(doc));

    const opcionales = config.documentos
      .filter((d) => d.tipoRequisito === 'OPCIONAL')
      .map((d) => d.tipoDocumentoSoporte)
      .filter((doc): doc is TipoDocumentoSoporte => Boolean(doc));

    return { obligatorios, opcionales };
  }

  async crearSolicitudComision(data: CreateSolicitudRequest): Promise<SolicitudComisionResponse> {
    try {
      return await apiClient.post<SolicitudComisionResponse>('/viaticos/api/v1/requests', data);
    } catch (error) {
      console.error('Error creando solicitud de comisión:', error);
      throw error;
    }
  }

  async subirDocumento(
    solicitudId: string,
    tipo: string,
    archivo: File,
    tipoMime?: string,
  ): Promise<DocumentoSoporte> {
    const formData = new FormData();
    formData.append('tipoDocumento', tipo);
    if (tipoMime) {
      formData.append('tipoMime', tipoMime);
    }
    formData.append('archivo', archivo);

    try {
      return await apiClient.upload<DocumentoSoporte>(
        `/viaticos/api/v1/requests/${solicitudId}/documentos`,
        formData,
      );
    } catch (error) {
      console.error('Error subiendo documento:', error);
      throw error;
    }
  }

  private sanitizeFileName(name: string): string {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/gi, 'n')
      .replace(/[^a-zA-Z0-9._-]/g, '_');
  }

  async obtenerChecklistDocumentos(
    tipoComisionado: string,
  ): Promise<ChecklistDocumentosResponse> {
    try {
      return await apiClient.get<ChecklistDocumentosResponse>(
        `/viaticos/api/v1/parametrizacion/checklist/${encodeURIComponent(tipoComisionado)}`,
      );
    } catch (error) {
      console.error('Error obteniendo checklist de documentos:', error);
      return { obligatorios: [], opcionales: [] };
    }
  }

  async obtenerSolicitudCompleta(solicitudId: string): Promise<SolicitudComisionResponse> {
    try {
      return await apiClient.get<SolicitudComisionResponse>(
        `/viaticos/api/v1/requests/${solicitudId}`,
      );
    } catch (error) {
      console.error('Error obteniendo solicitud:', error);
      throw error;
    }
  }

  async finalizarSolicitud(solicitudId: string): Promise<FinalizarSolicitudResponse> {
    try {
      return await apiClient.post<FinalizarSolicitudResponse>(
        `/viaticos/api/v1/requests/${solicitudId}/finalizar`,
        {},
      );
    } catch (error) {
      console.error('Error finalizando solicitud:', error);
      throw error;
    }
  }

  async exportarFormato023(solicitudId: string, codigo: string): Promise<void> {
    try {
      const blob = await apiClient.getBlob(`/viaticos/api/v1/solicitudes/${solicitudId}/exportar/pdf`);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Formato-023-Solicitud-${codigo}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exportando Formato 023:', error);
      throw error;
    }
  }
}

export const viaticosService = new ViaticosService();
export default viaticosService;
