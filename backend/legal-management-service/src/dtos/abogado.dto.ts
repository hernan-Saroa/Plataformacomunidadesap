export class CreateAbogadoDto {
    nombreCompleto: string;
    email: string;
    telefono?: string;
    especialidad?: string;
    fechaIngreso: Date;
    fotoUrl?: string;
}

export class AbogadoDashboardDto {
    id: string;
    nombreCompleto: string;
    email: string;
    especialidad: string;
    antiguedadAnios: number;
    totalExpedientes: number;
    expedientesCriticos: number;
    expedientesFinalizados: number;
    tasaExito: number;
    estado: string;
    fotoUrl: string;
}
