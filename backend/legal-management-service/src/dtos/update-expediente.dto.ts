export class UpdateExpedienteDto {
    cuantia?: number;
    demandado?: string;
    ubicacionFisica?: string;
    abogadoSustanciador?: string;
    estado?: string;
    nivelRiesgo?: string;
    provisionContable?: number;
    fechaEstimacionProvision?: string;
    observacionProvision?: string;
    // Radicado NO se puede actualizar
}
