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
    esDelitoAdminPublica?: boolean;
    esConductaPatrimonioPublico?: boolean;
    esOtroDelitoPenal?: boolean;
    otroDelitoPenalDescripcion?: string;
    camposAdicionales?: Record<string, any>;
    // Radicado NO se puede actualizar
}
