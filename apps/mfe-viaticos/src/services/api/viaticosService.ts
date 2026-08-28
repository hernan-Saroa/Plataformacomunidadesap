import apiClient from './apiClient';
import {
  SolicitudViatico,
  ResumenEstadisticoViaticos,
  Comisionado,
  CreateSolicitudRequest,
  SolicitudComisionResponse,
  DocumentoSoporte,
} from '../../types/viaticos';

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
  {
    id: 'sol-002',
    codigo: 'SOL-VIA-2026-002',
    cedulaComisionado: '52839102',
    nombreComisionado: 'Ana María Gómez',
    cargoComisionado: 'Asesora de Dirección',
    dependencia: 'Oficina Asesora de Planeación',
    sedeOrigen: 'Sede Central Bogotá',
    ciudadDestino: 'Cali',
    departamentoDestino: 'Valle del Cauca',
    fechaInicio: '2026-08-25',
    fechaFin: '2026-08-27',
    diasComision: 2,
    tipoComision: 'REUNION_TECNICA',
    medioTransporte: 'AEREO',
    justificacion: 'Acompañamiento a la autoevaluación institucional en la Sede Valle.',
    montoSolicitadoViaticos: 560000,
    montoSolicitadoGastosViaje: 120000,
    montoTotalEstimado: 680000,
    estado: 'APROBADO_TALENTO_HUMANO',
    requiereTiqueteAereo: true,
    creadoEn: '2026-08-11',
    actualizadoEn: '2026-08-12',
  },
  {
    id: 'sol-003',
    codigo: 'SOL-VIA-2026-003',
    cedulaComisionado: '79483920',
    nombreComisionado: 'Jorge Enrique Vargas',
    cargoComisionado: 'Auditor Interno',
    dependencia: 'Oficina de Control Interno',
    sedeOrigen: 'Sede Central Bogotá',
    ciudadDestino: 'Bucaramanga',
    departamentoDestino: 'Santander',
    fechaInicio: '2026-09-01',
    fechaFin: '2026-09-05',
    diasComision: 4,
    tipoComision: 'INSPECCION_TERRITORIAL',
    medioTransporte: 'AEREO',
    justificacion: 'Ejecución de auditoría interna de cobertura territorial en Sede Santander.',
    montoSolicitadoViaticos: 1120000,
    montoSolicitadoGastosViaje: 250000,
    montoTotalEstimado: 1370000,
    estado: 'SOLICITADO',
    requiereTiqueteAereo: true,
    creadoEn: '2026-08-12',
    actualizadoEn: '2026-08-12',
  },
];

export class ViaticosService {
  async obtenerSolicitudes(): Promise<SolicitudViatico[]> {
    try {
      const data = await apiClient.get<SolicitudViatico[]>('/viaticos/api/v1/solicitudes');
      if (Array.isArray(data) && data.length > 0) return data;
      return MOCK_SOLICITUDES;
    } catch {
      return MOCK_SOLICITUDES;
    }
  }

  async obtenerResumenEstadistico(): Promise<ResumenEstadisticoViaticos> {
    const solicitudes = await this.obtenerSolicitudes();
    return {
      totalSolicitudes: solicitudes.length,
      enProcesoAprobacion: solicitudes.filter(s => ['SOLICITADO', 'APROBADO_JEFE', 'APROBADO_TALENTO_HUMANO'].includes(s.estado)).length,
      enComisionActivas: solicitudes.filter(s => s.estado === 'EN_COMISION').length,
      pendientesLegalizar: solicitudes.filter(s => s.estado === 'PENDIENTE_LEGALIZACION').length,
      montoTotalEjecutado: solicitudes.reduce((acc, curr) => acc + curr.montoTotalEstimado, 0),
    };
  }

  async consultarComisionado(documento: string): Promise<Comisionado | null> {
    try {
      return await apiClient.get<Comisionado>(`/api/v1/comisionados/${documento}`);
    } catch {
      return null;
    }
  }

  async crearSolicitudComision(data: CreateSolicitudRequest): Promise<SolicitudComisionResponse> {
    try {
      return await apiClient.post<SolicitudComisionResponse>('/api/v1/requests', data);
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
      return await apiClient.post<DocumentoSoporte>(`/api/v1/requests/${solicitudId}/documentos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
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
