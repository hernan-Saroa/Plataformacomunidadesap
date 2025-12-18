export class CreateAudienciaDto {
    expedienteId: string;
    abogadoId: string;
    titulo: string;
    fechaHoraInicio: Date;
    duracionMinutos: number;
    modalidad: string;
    ubicacion?: string;
    linkReunion?: string;
    notasPreparacion?: string;
}

export class AudienciaDTO {
    id: string;
    titulo: string;
    fechaHoraInicio: Date;
    duracionMinutos: number;
    modalidad: string;
    ubicacion: string;
    linkReunion: string;
    estado: string;
    notasPreparacion: string;

    // Flattened info from relations
    expedienteId: string;
    radicado: string;
    nombreInvestigado: string;

    abogadoId: string;
    nombreAbogado: string;
}
