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
    cedulaComisionado: '123456789',
    nombreComisionado: 'Juan Pablo Suárez',
    cargoComisionado: 'Profesor Asociado',
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
    cedulaComisionado: '1004734004',
    nombreComisionado: 'Juan Pablo Suárez',
    cargoComisionado: 'Asesor de Proyectos',
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
    cedulaComisionado: '1019283746',
    nombreComisionado: 'Carlos Eduardo Ramírez Gómez',
    cargoComisionado: 'Docente Ocasional',
    dependencia: 'Subdirección Académica',
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
  {
    id: 'sol-004',
    codigo: 'SOL-VIA-2026-004',
    cedulaComisionado: '52839102',
    nombreComisionado: 'Ana María Gómez Quintero',
    cargoComisionado: 'Coordinadora Regional',
    dependencia: 'Dirección Territorial',
    sedeOrigen: 'Sede Central Bogotá',
    ciudadDestino: 'Cartagena',
    departamentoDestino: 'Bolívar',
    fechaInicio: '2026-09-08',
    fechaFin: '2026-09-10',
    diasComision: 2,
    tipoComision: 'SERVICIOS_INSTITUCIONALES',
    medioTransporte: 'TERRESTRE',
    justificacion: 'Visita de seguimiento a convenio interinstitucional en la Sede Bolívar.',
    montoSolicitadoViaticos: 420000,
    montoSolicitadoGastosViaje: 90000,
    montoTotalEstimado: 510000,
    estado: 'APROBADO_JEFE',
    requiereTiqueteAereo: false,
    creadoEn: '2026-08-14',
    actualizadoEn: '2026-08-15',
  },
  {
    id: 'sol-005',
    codigo: 'SOL-VIA-2026-005',
    cedulaComisionado: '79483920',
    nombreComisionado: 'Jorge Enrique Vargas Muñoz',
    cargoComisionado: 'Auditor Interno',
    dependencia: 'Oficina de Control Interno',
    sedeOrigen: 'Sede Central Bogotá',
    ciudadDestino: 'Barranquilla',
    departamentoDestino: 'Atlántico',
    fechaInicio: '2026-09-15',
    fechaFin: '2026-09-20',
    diasComision: 5,
    tipoComision: 'INSPECCION_TERRITORIAL',
    medioTransporte: 'AEREO',
    justificacion: 'Revisión de informes de gestión regional en la Sede Atlántico.',
    montoSolicitadoViaticos: 1200000,
    montoSolicitadoGastosViaje: 280000,
    montoTotalEstimado: 1480000,
    estado: 'EN_COMISION',
    requiereTiqueteAereo: true,
    creadoEn: '2026-08-16',
    actualizadoEn: '2026-08-18',
  },
];

const MOCK_COMISIONADOS: Comisionado[] = [
  {
    id: 'com-001',
    numero_documento: '123456789',
    primer_nombre: 'Juan',
    segundo_nombre: 'Pablo',
    primer_apellido: 'Suárez',
    segundo_apellido: '',
    email: 'juan.pablo.suarez@esap.edu.co',
    telefono_contacto: '3001234567',
    tipo_comisionado: 'FUNCIONARIO',
    origen_datos: 'HUMANO',
    autorizacion_habeas_data: true,
    fecha_autorizacion_habeas_data: new Date('2026-01-15'),
    ip_registro_habeas_data: '127.0.0.1',
  },
  {
    id: 'com-002',
    numero_documento: '1004734004',
    primer_nombre: 'Juan',
    segundo_nombre: 'Pablo',
    primer_apellido: 'Suárez',
    segundo_apellido: '',
    email: 'juan.pablo.suarez2@esap.edu.co',
    telefono_contacto: '3007654321',
    tipo_comisionado: 'CONTRATISTA',
    origen_datos: 'HUMANO',
    autorizacion_habeas_data: true,
    fecha_autorizacion_habeas_data: new Date('2026-02-10'),
    ip_registro_habeas_data: '127.0.0.1',
  },
  {
    id: 'com-003',
    numero_documento: '1019283746',
    primer_nombre: 'Carlos',
    segundo_nombre: 'Eduardo',
    primer_apellido: 'Ramírez',
    segundo_apellido: 'Gómez',
    email: 'carlos.ramirez@esap.edu.co',
    telefono_contacto: '3159876543',
    tipo_comisionado: 'FUNCIONARIO',
    origen_datos: 'HUMANO',
    autorizacion_habeas_data: true,
    fecha_autorizacion_habeas_data: new Date('2026-03-05'),
    ip_registro_habeas_data: '127.0.0.1',
  },
  {
    id: 'com-004',
    numero_documento: '52839102',
    primer_nombre: 'Ana',
    segundo_nombre: 'María',
    primer_apellido: 'Gómez',
    segundo_apellido: 'Quintero',
    email: 'ana.gomez@esap.edu.co',
    telefono_contacto: '3204567890',
    tipo_comisionado: 'DOCENTE',
    origen_datos: 'HUMANO',
    autorizacion_habeas_data: true,
    fecha_autorizacion_habeas_data: new Date('2026-03-20'),
    ip_registro_habeas_data: '127.0.0.1',
  },
  {
    id: 'com-005',
    numero_documento: '79483920',
    primer_nombre: 'Jorge',
    segundo_nombre: 'Enrique',
    primer_apellido: 'Vargas',
    segundo_apellido: 'Muñoz',
    email: 'jorge.vargas@esap.edu.co',
    telefono_contacto: '3501234567',
    tipo_comisionado: 'FUNCIONARIO',
    origen_datos: 'HUMANO',
    autorizacion_habeas_data: true,
    fecha_autorizacion_habeas_data: new Date('2026-04-12'),
    ip_registro_habeas_data: '127.0.0.1',
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
      const mock = MOCK_COMISIONADOS.find(c => c.numero_documento === documento);
      return mock ?? null;
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
