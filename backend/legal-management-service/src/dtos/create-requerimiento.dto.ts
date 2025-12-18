export class CreateRequerimientoDto {
    radicadoExterno: string;
    entidadId: number;
    asunto: string;
    tipoRequerimiento: string;
    fechaRecepcion: string; // YYYY-MM-DD
    diasPlazoOtorgado?: number;
    archivoId?: string;
    usuarioAsignadoId?: number;
}
