import apiClient from './apiClient';
import { ParametrizacionFormulario, ConfigTipoComisionado, CampoFormulario, TipoDocumentoSoporte } from '../../types/parametrizacion';

export class ParametrizacionService {
  async obtenerParametrizacionFormulario(): Promise<ParametrizacionFormulario> {
    try {
      return await apiClient.get<ParametrizacionFormulario>('/viaticos/api/v1/parametrizacion/formulario');
    } catch (error) {
      console.error('Error obteniendo parametrización del formulario:', error);
      return { campos: [], configuraciones: {} };
    }
  }

  async obtenerParametrizacionPorCodigo(codigoFormulario: string): Promise<ConfigTipoComisionado | null> {
    try {
      return await apiClient.get<ConfigTipoComisionado>(`/viaticos/api/v1/parametrizacion/formulario/${encodeURIComponent(codigoFormulario)}`);
    } catch (error) {
      console.error('Error obteniendo parametrización por código:', error);
      return null;
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

  async obtenerConfiguracionPorCodigoFormulario(codigoFormulario: string): Promise<ConfigTipoComisionado | null> {
    try {
      return await apiClient.get<ConfigTipoComisionado>(`/viaticos/api/v1/parametrizacion/config-tipo-comisionado/formulario/${encodeURIComponent(codigoFormulario)}`);
    } catch (error) {
      console.error('Error obteniendo configuración por código de formulario:', error);
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

  async obtenerCamposFormulario(): Promise<CampoFormulario[]> {
    try {
      const data = await this.obtenerParametrizacionFormulario();
      return data.campos || [];
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
