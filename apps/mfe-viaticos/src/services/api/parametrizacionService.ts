import apiClient from './apiClient';
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

const BASE = '/viaticos/api/v1/parametrizacion';

export class ParametrizacionService {
  async obtenerParametrizacionFormulario(): Promise<ParametrizacionFormulario> {
    try {
      return await apiClient.get<ParametrizacionFormulario>(`${BASE}/formulario`);
    } catch (error) {
      console.error('Error obteniendo parametrización del formulario:', error);
      return { campos: [], configuraciones: {} };
    }
  }

  async obtenerParametrizacionPorCodigo(codigoFormulario: string): Promise<ConfigTipoComisionado | null> {
    try {
      return await apiClient.get<ConfigTipoComisionado>(`${BASE}/formulario/${encodeURIComponent(codigoFormulario)}`);
    } catch (error) {
      console.error('Error obteniendo parametrización por código:', error);
      return null;
    }
  }

  async obtenerConfiguracionPorTipo(tipoComisionado: string): Promise<ConfigTipoComisionado | null> {
    try {
      return await apiClient.get<ConfigTipoComisionado>(`${BASE}/config-tipo-comisionado/${encodeURIComponent(tipoComisionado)}`);
    } catch (error) {
      console.error('Error obteniendo configuración por tipo:', error);
      return null;
    }
  }

  async obtenerConfiguracionPorCodigoFormulario(codigoFormulario: string): Promise<ConfigTipoComisionado | null> {
    try {
      return await apiClient.get<ConfigTipoComisionado>(`${BASE}/config-tipo-comisionado/formulario/${encodeURIComponent(codigoFormulario)}`);
    } catch (error) {
      console.error('Error obteniendo configuración por código de formulario:', error);
      return null;
    }
  }

  async obtenerTodasConfiguraciones(): Promise<ConfigTipoComisionado[]> {
    try {
      return await apiClient.get<ConfigTipoComisionado[]>(`${BASE}/config-tipo-comisionado`);
    } catch (error) {
      console.error('Error obteniendo todas las configuraciones:', error);
      return [];
    }
  }

  async obtenerConfiguracionPorDefecto(): Promise<ConfigTipoComisionado | null> {
    try {
      return await apiClient.get<ConfigTipoComisionado>(`${BASE}/config-tipo-comisionado/default`);
    } catch (error) {
      console.error('Error obteniendo configuración por defecto:', error);
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
      const response = await apiClient.get<{ faltantes: string[] }>(`${BASE}/validar-documentos?${params.toString()}`);
      return response.faltantes || [];
    } catch (error) {
      console.error('Error validando documentos requeridos:', error);
      return [];
    }
  }

  async obtenerCamposFormulario(): Promise<CampoFormulario[]> {
    try {
      return await apiClient.get<CampoFormulario[]>(`${BASE}/campos-formulario`);
    } catch (error) {
      console.error('Error obteniendo campos del formulario:', error);
      return [];
    }
  }

  async obtenerTiposDocumentoSoporte(): Promise<TipoDocumentoSoporte[]> {
    try {
      return await apiClient.get<TipoDocumentoSoporte[]>(`${BASE}/tipos-documento-soporte`);
    } catch (error) {
      console.error('Error obteniendo tipos de documento soporte:', error);
      return [];
    }
  }

  async crearCampoFormulario(dto: CrearCampoFormularioDTO): Promise<CampoFormulario | null> {
    try {
      return await apiClient.post<CampoFormulario>(`${BASE}/campos-formulario`, dto);
    } catch (error) {
      console.error('Error creando campo del formulario:', error);
      throw error;
    }
  }

  async actualizarCampoFormulario(clave: string, dto: ActualizarCampoFormularioDTO): Promise<CampoFormulario | null> {
    try {
      return await apiClient.put<CampoFormulario>(`${BASE}/campos-formulario/${encodeURIComponent(clave)}`, dto);
    } catch (error) {
      console.error('Error actualizando campo del formulario:', error);
      throw error;
    }
  }

  async eliminarCampoFormulario(clave: string): Promise<void> {
    try {
      await apiClient.delete(`${BASE}/campos-formulario/${encodeURIComponent(clave)}`);
    } catch (error) {
      console.error('Error eliminando campo del formulario:', error);
      throw error;
    }
  }

  async crearConfigTipoComisionado(dto: CrearConfigTipoComisionadoDTO): Promise<ConfigTipoComisionado | null> {
    try {
      return await apiClient.post<ConfigTipoComisionado>(`${BASE}/config-tipo-comisionado`, dto);
    } catch (error) {
      console.error('Error creando configuración de tipo comisionado:', error);
      throw error;
    }
  }

  async actualizarConfigTipoComisionado(tipo: string, dto: ActualizarConfigTipoComisionadoDTO): Promise<ConfigTipoComisionado | null> {
    try {
      return await apiClient.put<ConfigTipoComisionado>(`${BASE}/config-tipo-comisionado/${encodeURIComponent(tipo)}`, dto);
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
}

export const parametrizacionService = new ParametrizacionService();
export default parametrizacionService;
