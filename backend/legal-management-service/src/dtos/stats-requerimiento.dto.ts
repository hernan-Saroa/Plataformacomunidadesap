// DTO para estadísticas generales del dashboard
export class StatsRequerimientoDto {
    // Contadores por estado
    enPreparacion: number;
    enRevision: number;
    aprobado: number;
    enviado: number;
    cerrado: number;
    total: number;

    // Contadores por prioridad
    prioridadCritica: number;
    prioridadAlta: number;
    prioridadNormal: number;
    prioridadBaja: number;

    // Contadores por tipo
    tipoInformacion: number;
    tipoAuditoria: number;
    tipoHallazgo: number;
    tipoAjuste: number;

    // Alertas de vencimiento
    vencidosHoy: number;
    vencenProximos3Dias: number;
    vencenProximos7Dias: number;
    vencidos: number;

    // Organismos más activos (Top 5)
    organismosMasActivos: OrganismoStatsDto[];

    // Tendencias mensuales (últimos 6 meses)
    tendenciaMensual: TendenciaMensualDto[];
}

// DTO para organismos más activos
export class OrganismoStatsDto {
    organismoId: number;
    organismoNombre: string;
    sigla: string;
    totalRequerimientos: number;
    pendientes: number;
    cerrados: number;
}

// DTO para tendencia mensual
export class TendenciaMensualDto {
    mes: string; // Formato: YYYY-MM
    mesNombre: string; // Ej: "Enero 2025"
    totalRecibidos: number;
    totalCerrados: number;
    promedioRespuestaDias: number;
}

// DTO para actualizar estado de requerimiento
export class UpdateEstadoRequerimientoDto {
    estado: 'EN_PREPARACION' | 'EN_REVISION' | 'APROBADO' | 'ENVIADO' | 'CERRADO';
    observaciones?: string;
}

// DTO para filtros de búsqueda avanzada
export class FiltrosRequerimientoDto {
    estado?: string;
    tipoRequerimiento?: string;
    prioridad?: string;
    entidadId?: number;
    fechaDesde?: string;
    fechaHasta?: string;
    usuarioAsignadoId?: number;
    busqueda?: string; // Búsqueda en radicado o asunto
}

