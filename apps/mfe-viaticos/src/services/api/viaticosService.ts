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
} from '../../types/viaticos';
import { formatearNombreComisionado } from '../../utils/viaticosUtils';

const MOCK_SOLICITUDES: SolicitudViatico[] = [
  {
    id: 'sol-001',
    codigo: 'SOL-VIA-2026-001',
    cedulaComisionado: '1019283746',
    nombreComisionado: 'Carlos Eduardo Ramírez',
    cargoComisionado: 'Docente Ocasional',
    dependencia: 'Subdirección Académica',
    sedeOrigen: 'Sede Central Bogotá',
    ciudadDestino: 'Medellín',
    departamentoDestino: 'Antioquia',
    fechaInicio: '2026-08-20',
    fechaFin: '2026-08-23',
    diasComision: 3,
    tipoComision: 'CAPACITACION_DOCENTE',
    medioTransporte: 'AEREO',
    justificacion: 'Impartir módulo presencial de Gestión Pública en la Sede Territorial Antioquia.',
    montoSolicitadoViaticos: 840000,
    montoSolicitadoGastosViaje: 180000,
    montoTotalEstimado: 1020000,
    estado: 'RESOLUCION_EMITIDA',
    requiereTiqueteAereo: true,
    numeroResolucion: 'RES-0452-2026',
    fechaResolucion: '2026-08-15',
    creadoEn: '2026-08-10',
    actualizadoEn: '2026-08-15',
  },
];

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
      requiereTiqueteAereo: s.requiereTiquetes,
      creadoEn: s.creadoEn.slice(0, 10),
      actualizadoEn: s.actualizadoEn.slice(0, 10),
    };
  }

  async obtenerSolicitudes(): Promise<SolicitudViatico[]> {
    try {
      const data = await apiClient.get<SolicitudListaResponse[] | SolicitudListaResponse>('/viaticos/api/v1/solicitudes');
      const lista = Array.isArray(data) ? data : [data];
      if (lista.length === 0) return MOCK_SOLICITUDES;
      return lista.map((item) => this.mapearSolicitudLista(item));
    } catch {
      return MOCK_SOLICITUDES;
    }
  }

  async obtenerResumenEstadistico(): Promise<ResumenEstadisticoViaticos> {
    const solicitudes = await this.obtenerSolicitudes();
    return {
      totalSolicitudes: solicitudes.length,
      enProcesoAprobacion: solicitudes.filter((s) =>
        ['SOLICITADO', 'APROBADO_JEFE', 'APROBADO_TALENTO_HUMANO'].includes(s.estado),
      ).length,
      enComisionActivas: solicitudes.filter((s) => s.estado === 'EN_COMISION').length,
      pendientesLegalizar: solicitudes.filter((s) => s.estado === 'PENDIENTE_LEGALIZACION').length,
      montoTotalEjecutado: solicitudes.reduce((acc, curr) => acc + curr.montoTotalEstimado, 0),
    };
  }

  async consultarComisionado(documento: string): Promise<Comisionado | null> {
    try {
      return await apiClient.get<Comisionado>(`/viaticos/api/v1/comisionados/${documento}`);
    } catch {
      return null;
    }
  }

  async crearSolicitudComision(data: CreateSolicitudRequest): Promise<SolicitudComisionResponse> {
    try {
      return await apiClient.post<SolicitudComisionResponse>('/viaticos/api/v1/requests', data);
    } catch (error) {
      console.error('Error creando solicitud de comisión:', error);
      throw error;
    }
  }

  async subirDocumento(solicitudId: string, tipo: string, archivo: File): Promise<DocumentoSoporte> {
    const formData = new FormData();
    formData.append('tipoDocumento', tipo);
    formData.append('nombreArchivoOriginal', archivo.name);
    formData.append('nombreArchivoSeguro', this.sanitizeFileName(archivo.name));
    formData.append('urlRepositorio', `/uploads/${solicitudId}/${this.sanitizeFileName(archivo.name)}`);
    formData.append('archivo', archivo);

    try {
      return await apiClient.post<DocumentoSoporte>(
        `/viaticos/api/v1/requests/${solicitudId}/documentos`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
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
}

export const viaticosService = new ViaticosService();
export default viaticosService;
