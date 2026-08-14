import { Injectable } from '@nestjs/common';

export interface SolicitudViaticoEntity {
  id: string;
  codigo: string;
  cedulaComisionado: string;
  nombreComisionado: string;
  cargoComisionado: string;
  dependencia: string;
  sedeOrigen: string;
  ciudadDestino: string;
  departamentoDestino: string;
  fechaInicio: string;
  fechaFin: string;
  diasComision: number;
  tipoComision: string;
  medioTransporte: string;
  justificacion: string;
  montoSolicitadoViaticos: number;
  montoSolicitadoGastosViaje: number;
  montoTotalEstimado: number;
  estado: string;
  requiereTiqueteAereo: boolean;
  numeroResolucion?: string;
  fechaResolucion?: string;
  creadoEn: string;
  actualizadoEn: string;
}

@Injectable()
export class TravelExpensesService {
  private solicitudes: SolicitudViaticoEntity[] = [
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

  findAll(): SolicitudViaticoEntity[] {
    return this.solicitudes;
  }

  findOne(id: string): SolicitudViaticoEntity | undefined {
    return this.solicitudes.find(s => s.id === id);
  }

  create(dto: Partial<SolicitudViaticoEntity>): SolicitudViaticoEntity {
    const nueva: SolicitudViaticoEntity = {
      id: `sol-${Date.now()}`,
      codigo: `SOL-VIA-2026-${Math.floor(100 + Math.random() * 900)}`,
      cedulaComisionado: dto.cedulaComisionado || '1020304050',
      nombreComisionado: dto.nombreComisionado || 'Funcionario ESAP',
      cargoComisionado: dto.cargoComisionado || 'Profesional Especializado',
      dependencia: dto.dependencia || 'Subdirección de Gestión Institucional',
      sedeOrigen: dto.sedeOrigen || 'Sede Central Bogotá',
      ciudadDestino: dto.ciudadDestino || 'Cartagena',
      departamentoDestino: dto.departamentoDestino || 'Bolívar',
      fechaInicio: dto.fechaInicio || new Date().toISOString().split('T')[0],
      fechaFin: dto.fechaFin || new Date().toISOString().split('T')[0],
      diasComision: dto.diasComision || 2,
      tipoComision: dto.tipoComision || 'SERVICIOS_INSTITUCIONALES',
      medioTransporte: dto.medioTransporte || 'AEREO',
      justificacion: dto.justificacion || 'Comisión oficial.',
      montoSolicitadoViaticos: dto.montoSolicitadoViaticos || 560000,
      montoSolicitadoGastosViaje: dto.montoSolicitadoGastosViaje || 120000,
      montoTotalEstimado: (dto.montoSolicitadoViaticos || 560000) + (dto.montoSolicitadoGastosViaje || 120000),
      estado: 'SOLICITADO',
      requiereTiqueteAereo: dto.requiereTiqueteAereo ?? true,
      creadoEn: new Date().toISOString().split('T')[0],
      actualizadoEn: new Date().toISOString().split('T')[0],
    };
    this.solicitudes.unshift(nueva);
    return nueva;
  }
}
