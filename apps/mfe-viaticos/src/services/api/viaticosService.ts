import apiClient from './apiClient';
import { buildApiUrl } from '../../../config/environment';
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
   LiquidacionResponse,
   CalcularLiquidacionRequest,
   CategoriaInvestigador,
   TicketValidationResult,
   ValidateTicketRequest,
   SaldoTiquete,
   RutaRestringida,
   ExcepcionTiquete,
   CreateExcepcionTiqueteRequest,
  } from '../../types/viaticos';
import dependenciasService, { Dependencia } from '../../../../shell/src/services/api/dependencias.service';
import {
  ParametrizacionFormulario,
  ConfigTipoComisionado,
  CampoFormulario,
  TipoDocumentoSoporte,
  CrearCampoFormularioDTO,
  ActualizarCampoFormularioDTO,
  CrearConfigTipoComisionadoDTO,
  ActualizarConfigTipoComisionadoDTO,
  EscalaViatico,
  TarifaInvestigador,
  TarifaRegionalExcepcion,
  LiquidationParam,
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

  /**
   * Devuelve la lista plana de ciudades (tipDivision = 'CIUDAD') usando
   * `auth.geopolitica`. Se consume en el panel admin de parametrización
   * de tiquetes para alimentar los `SearchableSelect` de origen / destino
   * de rutas restringidas.
   *
   * Si la API no está disponible, recurre al catálogo estático
   * (`fallbackGeopolitica`) para no bloquear la operación.
   */
  async obtenerTodasCiudades(): Promise<Geopolitica[]> {
    try {
      const res = await apiClient.get<unknown>(
        '/auth/api/v1/estructura-organizacional/geopolitica/ciudades',
      );
      const lista = extraerListaGeopolitica(res)
        .filter((g) => g.tipDivision === 'CIUDAD' && g.nomDivGeopolitica?.trim());
      if (lista.length > 0) {
        return lista;
      }
    } catch (error) {
      console.warn('[viaticos] ciudades auth no disponibles, usando catálogo local:', error);
    }
    return fallbackGeopolitica().filter(
      (g) => g.tipDivision === 'CIUDAD' && g.nomDivGeopolitica?.trim(),
    );
  }

  /**
   * Lista dependencias activas consumiendo `auth.dependencias` vía
   * el servicio transversal `dependenciasService` (shell). El shell
   * se encarga de serializar `includeInactive`/`search` y de hacer
   * el unwrapping robusto de la respuesta del auth-service.
   *
   * Catálogo que alimenta el `SearchableSelect` de la dependencia
   * solicitante en `NuevaSolicitudModal` y la pestaña "Dependencias"
   * de `ParametrizacionManager`.
   *
   * Si el microservicio de auth no responde, retorna [] para que la UI
   * muestre el estado vacío y ofrezca reintentar (no recurrimos a un
   * fallback estático porque la dependencia es por instancia
   * organizacional del cliente, no del catálogo de ciudades).
   */
  async obtenerDependencias(
    options: { includeInactive?: boolean; search?: string } = {},
  ): Promise<Dependencia[]> {
    try {
      return await dependenciasService.listar(options);
    } catch (error) {
      console.warn('[viaticos] dependencias auth no disponibles:', error);
      return [];
    }
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

  /**
   * Actualiza los campos editables de un borrador (estado PENDIENTE).
   * Se usa al volver al paso 2 y guardar de nuevo (p. ej. al corregir fechas).
   */
  async actualizarSolicitud(
    solicitudId: string,
    data: Partial<CreateSolicitudRequest>,
  ): Promise<SolicitudComisionResponse> {
    try {
      return await apiClient.put<SolicitudComisionResponse>(
        `/viaticos/api/v1/requests/${solicitudId}`,
        data,
      );
    } catch (error) {
      console.error('Error actualizando solicitud de comisión:', error);
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

  /**
   * Elimina un documento de soporte de la solicitud. El backend borra el
   * registro de la BD y el archivo físico del storage, permitiendo volver a
   * cargar el documento (re-upload).
   */
  async eliminarDocumento(
    solicitudId: string,
    documentoId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      return await apiClient.delete<{ success: boolean; message: string }>(
        `/viaticos/api/v1/requests/${solicitudId}/documentos/${documentoId}`,
      );
    } catch (error) {
      console.error('Error eliminando documento:', error);
      throw error;
    }
  }

  /**
   * Construye la URL absoluta de acceso (previsualización / descarga) a partir
   * del `urlRepositorio` guardado en BD (p. ej. `/uploads/{solicitudId}/{archivo}`).
   * Funciona tanto en modo gateway (`/viaticos/uploads/...`) como en modo directo
   * (`http://localhost:3010/uploads/...`).
   */
  obtenerUrlArchivo(urlRepositorio?: string): string {
    if (!urlRepositorio) return '';
    if (/^https?:\/\//i.test(urlRepositorio) || urlRepositorio.startsWith('blob:')) {
      return urlRepositorio;
    }
    return buildApiUrl('viaticos', urlRepositorio);
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
  async exportarFormato023(solicitudId: string, codigo: string): Promise<Blob> {
    try {
      return await apiClient.getBlob(`/viaticos/api/v1/solicitudes/${solicitudId}/exportar/pdf`);
    } catch (error) {
      console.error('Error exportando Formato 023:', error);
      throw error;
    }
  }

  async calcularLiquidacion(data: CalcularLiquidacionRequest): Promise<LiquidacionResponse> {
    try {
      return await apiClient.post<LiquidacionResponse>('/viaticos/api/v1/liquidation/calculate', data);
    } catch (error) {
      console.error('Error calculando liquidación:', error);
      throw error;
    }
  }

  // ==================== ESCALAS ====================

  async obtenerEscalas(): Promise<EscalaViatico[]> {
    try {
      return await apiClient.get<EscalaViatico[]>('/viaticos/api/v1/liquidation/config/escalas');
    } catch (error) {
      console.error('Error obteniendo escalas:', error);
      return [];
    }
  }

  async obtenerEscalaPorId(id: number): Promise<EscalaViatico | null> {
    try {
      const res = await apiClient.get<{ escala: EscalaViatico | null }>(`/viaticos/api/v1/liquidation/config/escalas/${id}`);
      return res.escala;
    } catch (error) {
      console.error('Error obteniendo escala:', error);
      return null;
    }
  }

  async crearEscala(dto: Partial<EscalaViatico>): Promise<EscalaViatico | null> {
    try {
      return await apiClient.post<EscalaViatico>('/viaticos/api/v1/liquidation/config/escalas', dto);
    } catch (error) {
      console.error('Error creando escala:', error);
      throw error;
    }
  }

  async actualizarEscala(id: number, dto: Partial<EscalaViatico>): Promise<EscalaViatico | null> {
    try {
      return await apiClient.put<EscalaViatico>(`/viaticos/api/v1/liquidation/config/escalas/${id}`, dto);
    } catch (error) {
      console.error('Error actualizando escala:', error);
      throw error;
    }
  }

  async eliminarEscala(id: number): Promise<{ message: string }> {
    try {
      return await apiClient.delete<{ message: string }>(`/viaticos/api/v1/liquidation/config/escalas/${id}`);
    } catch (error) {
      console.error('Error eliminando escala:', error);
      throw error;
    }
  }

  // ==================== TARIFAS INVESTIGADOR ====================

  async obtenerTarifasInvestigadores(): Promise<TarifaInvestigador[]> {
    try {
      return await apiClient.get<TarifaInvestigador[]>('/viaticos/api/v1/liquidation/config/tarifas-investigadores');
    } catch (error) {
      console.error('Error obteniendo tarifas de investigadores:', error);
      return [];
    }
  }

  async crearTarifaInvestigador(dto: Partial<TarifaInvestigador>): Promise<TarifaInvestigador | null> {
    try {
      return await apiClient.post<TarifaInvestigador>('/viaticos/api/v1/liquidation/config/tarifas-investigadores', dto);
    } catch (error) {
      console.error('Error creando tarifa de investigador:', error);
      throw error;
    }
  }

  async actualizarTarifaInvestigador(id: number, dto: Partial<TarifaInvestigador>): Promise<TarifaInvestigador | null> {
    try {
      return await apiClient.put<TarifaInvestigador>(`/viaticos/api/v1/liquidation/config/tarifas-investigadores/${id}`, dto);
    } catch (error) {
      console.error('Error actualizando tarifa de investigador:', error);
      throw error;
    }
  }

  async eliminarTarifaInvestigador(id: number): Promise<{ message: string }> {
    try {
      return await apiClient.delete<{ message: string }>(`/viaticos/api/v1/liquidation/config/tarifas-investigadores/${id}`);
    } catch (error) {
      console.error('Error eliminando tarifa de investigador:', error);
      throw error;
    }
  }

  // ==================== EXCEPCIONES REGIONALES ====================

  async obtenerExcepcionesRegionales(): Promise<TarifaRegionalExcepcion[]> {
    try {
      return await apiClient.get<TarifaRegionalExcepcion[]>('/viaticos/api/v1/liquidation/config/excepciones-regionales');
    } catch (error) {
      console.error('Error obteniendo excepciones regionales:', error);
      return [];
    }
  }

  async crearExcepcionRegional(dto: Partial<TarifaRegionalExcepcion>): Promise<TarifaRegionalExcepcion | null> {
    try {
      return await apiClient.post<TarifaRegionalExcepcion>('/viaticos/api/v1/liquidation/config/excepciones-regionales', dto);
    } catch (error) {
      console.error('Error creando excepción regional:', error);
      throw error;
    }
  }

  async actualizarExcepcionRegional(id: number, dto: Partial<TarifaRegionalExcepcion>): Promise<TarifaRegionalExcepcion | null> {
    try {
      return await apiClient.put<TarifaRegionalExcepcion>(`/viaticos/api/v1/liquidation/config/excepciones-regionales/${id}`, dto);
    } catch (error) {
      console.error('Error actualizando excepción regional:', error);
      throw error;
    }
  }

  async eliminarExcepcionRegional(id: number): Promise<{ message: string }> {
    try {
      return await apiClient.delete<{ message: string }>(`/viaticos/api/v1/liquidation/config/excepciones-regionales/${id}`);
    } catch (error) {
      console.error('Error eliminando excepción regional:', error);
      throw error;
    }
  }

  async obtenerCatalogoDepartamentos(): Promise<string[]> {
    try {
      return await apiClient.get<string[]>('/viaticos/api/v1/liquidation/config/catalogo-departamentos');
    } catch (error) {
      console.error('Error obteniendo catálogo de departamentos:', error);
      return [];
    }
  }

  // ==================== PARÁMETROS GLOBALES ====================

  async obtenerParametrosLiquidacion(): Promise<LiquidationParam[]> {
    try {
      return await apiClient.get<LiquidationParam[]>('/viaticos/api/v1/liquidation/config/parametros');
    } catch (error) {
      console.error('Error obteniendo parámetros de liquidación:', error);
      return [];
    }
  }

  async actualizarParametrosLiquidacion(dto: {
    smmlv?: number;
    factorContratista?: number;
    factorSinPernocta?: number;
    cacheTtlMinutes?: number;
  }): Promise<LiquidationParam[]> {
    try {
      return await apiClient.put<LiquidationParam[]>('/viaticos/api/v1/liquidation/config/parametros', dto);
    } catch (error) {
      console.error('Error actualizando parámetros de liquidación:', error);
      throw error;
    }
  }

  // ========================================================================
  // TIQUETES (RF-LIQ-003 / RF-LIQ-004)
  // ========================================================================

  /**
   * Valida de forma proactiva si una solicitud de tiquete es viable.
   * No muta el saldo; sólo devuelve flags y semáforo.
   */
  async validarTiquete(data: ValidateTicketRequest): Promise<TicketValidationResult> {
    try {
      return await apiClient.post<TicketValidationResult>(
        '/viaticos/api/v1/tickets/validate',
        data,
      );
    } catch (error) {
      console.error('Error validando tiquete:', error);
      // Respuesta neutra para que el frontend no bloquee por error de red.
      return {
        is_valid: false,
        requires_route_exception: false,
        requires_budget_exception: false,
        force_land_transport: false,
        saldo_actual_dependencia: 0,
        holgura_aplicada_porcentaje: 15,
        monto_reserva_con_holgura: data.montoEstimadoTiquete,
        ruta_restringida_encontrada: null,
        message: 'No fue posible validar el tiquete con el servidor.',
        nivel_alerta: 'ROJO',
        mensaje_alerta:
          'No fue posible contactar el servicio de validación de tiquetes.',
      };
    }
  }

  async obtenerSaldosTiquetes(): Promise<SaldoTiquete[]> {
    try {
      return await apiClient.get<SaldoTiquete[]>('/viaticos/api/v1/tickets/saldos');
    } catch (error) {
      console.error('Error obteniendo saldos de tiquetes:', error);
      return [];
    }
  }

  async crearSaldoTiquete(
    dto: Partial<SaldoTiquete>,
  ): Promise<SaldoTiquete | null> {
    try {
      return await apiClient.post<SaldoTiquete>(
        '/viaticos/api/v1/tickets/saldos',
        dto,
      );
    } catch (error) {
      console.error('Error creando saldo de tiquetes:', error);
      throw error;
    }
  }

  async actualizarSaldoTiquete(
    id: string,
    dto: Partial<SaldoTiquete>,
  ): Promise<SaldoTiquete | null> {
    try {
      return await apiClient.put<SaldoTiquete>(
        `/viaticos/api/v1/tickets/saldos/${id}`,
        dto,
      );
    } catch (error) {
      console.error('Error actualizando saldo de tiquetes:', error);
      throw error;
    }
  }

  async eliminarSaldoTiquete(
    id: string,
  ): Promise<{ message: string }> {
    try {
      return await apiClient.delete<{ message: string }>(
        `/viaticos/api/v1/tickets/saldos/${id}`,
      );
    } catch (error) {
      console.error('Error eliminando saldo de tiquetes:', error);
      throw error;
    }
  }

  async obtenerSaldoTiquetePorDependencia(
    dependenciaId: string,
  ): Promise<SaldoTiquete | null> {
    try {
      return await apiClient.get<SaldoTiquete>(
        `/viaticos/api/v1/tickets/saldos/${encodeURIComponent(dependenciaId)}`,
      );
    } catch (error) {
      console.error('Error obteniendo saldo de tiquetes:', error);
      return null;
    }
  }

  async obtenerRutasRestringidas(): Promise<RutaRestringida[]> {
    try {
      return await apiClient.get<RutaRestringida[]>(
        '/viaticos/api/v1/tickets/rutas-restringidas',
      );
    } catch (error) {
      console.error('Error obteniendo rutas restringidas:', error);
      return [];
    }
  }

  async crearRutaRestringida(
    dto: Partial<RutaRestringida>,
  ): Promise<RutaRestringida | null> {
    try {
      return await apiClient.post<RutaRestringida>(
        '/viaticos/api/v1/tickets/rutas-restringidas',
        dto,
      );
    } catch (error) {
      console.error('Error creando ruta restringida:', error);
      throw error;
    }
  }

  async actualizarRutaRestringida(
    id: number,
    dto: Partial<RutaRestringida>,
  ): Promise<RutaRestringida | null> {
    try {
      return await apiClient.put<RutaRestringida>(
        `/viaticos/api/v1/tickets/rutas-restringidas/${id}`,
        dto,
      );
    } catch (error) {
      console.error('Error actualizando ruta restringida:', error);
      throw error;
    }
  }

  async eliminarRutaRestringida(
    id: number,
  ): Promise<{ message: string }> {
    try {
      return await apiClient.delete<{ message: string }>(
        `/viaticos/api/v1/tickets/rutas-restringidas/${id}`,
      );
    } catch (error) {
      console.error('Error eliminando ruta restringida:', error);
      throw error;
    }
  }

  async registrarExcepcionTiquete(
    dto: CreateExcepcionTiqueteRequest,
  ): Promise<ExcepcionTiquete | null> {
    try {
      return await apiClient.post<ExcepcionTiquete>(
        '/viaticos/api/v1/tickets/excepciones',
        dto,
      );
    } catch (error) {
      console.error('Error registrando excepción de tiquete:', error);
      throw error;
    }
  }

  // RF-LIQ-004 — Holgura global parametrizable

  async obtenerHolguraGlobal(): Promise<{
    id: number;
    clave: string;
    valor: string;
    tipo: string;
    descripcion: string | null;
  } | null> {
    try {
      const res = await apiClient.get<{
        id: number;
        clave: string;
        valor: string;
        tipo: string;
        descripcion: string | null;
      } | null>('/viaticos/api/v1/tickets/config/holgura');
      return res;
    } catch (error) {
      console.error('Error obteniendo holgura global:', error);
      return null;
    }
  }

  async actualizarHolguraGlobal(
    holguraPorcentaje: number,
  ): Promise<{
    id: number;
    clave: string;
    valor: string;
    tipo: string;
    descripcion: string | null;
  } | null> {
    try {
      return await apiClient.put<{
        id: number;
        clave: string;
        valor: string;
        tipo: string;
        descripcion: string | null;
      }>(
        '/viaticos/api/v1/tickets/config/holgura',
        { holguraPorcentaje },
      );
    } catch (error) {
      console.error('Error actualizando holgura global:', error);
      throw error;
    }
  }
}

export const viaticosService = new ViaticosService();
export default viaticosService;
