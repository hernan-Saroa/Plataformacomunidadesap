import { IsString, IsOptional, IsNumber, IsDateString, IsEnum, Length, IsArray } from 'class-validator';

export class CreateExpedienteDto {
    @IsString()
    @Length(23, 23, { message: 'El radicado debe tener 23 dígitos.' })
    radicado: string;

    @IsString()
    jurisdiccion: string;

    @IsString()
    medioControl: string;

    @IsString()
    juzgadoConocimiento: string;

    // Partes
    @IsString()
    demandante: string;

    @IsString()
    tipoIdDemandante: string;

    @IsString()
    numeroIdDemandante: string;

    @IsString()
    demandado: string;

    @IsString()
    tipoIdDemandado: string;

    @IsString()
    numeroIdDemandado: string;

    // Demanda
    @IsString()
    pretensionDemandante: string;

    @IsOptional()
    @IsString()
    actoAdministrativoDemandado?: string;

    @IsNumber()
    @IsOptional()
    cuantia?: number;

    // Provisión y Riesgo
    @IsOptional()
    @IsString()
    nivelRiesgo?: string;

    @IsOptional()
    @IsNumber()
    provisionContable?: number;

    @IsOptional()
    @IsDateString()
    fechaEstimacionProvision?: string;

    @IsOptional()
    @IsString()
    observacionProvision?: string;

    // Fechas
    @IsDateString()
    fechaNotificacion: string;

    @IsDateString()
    fechaDemandaPresentada: string;

    @IsOptional()
    @IsDateString()
    fechaVencimientoTermino?: string;

    // Asignación
    @IsOptional()
    @IsString()
    abogadoSustanciadorId?: string; // Para vincular con auth users

    @IsOptional()
    @IsNumber()
    terminoProcesalDias?: number;

    @IsOptional()
    @IsString()
    tipoConteoTermino?: 'HABILES' | 'CALENDARIO' | 'HORAS';

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    documentosInicialesUrls?: string[];

    @IsOptional()
    camposAdicionales?: Record<string, any>;

    @IsOptional()
    @IsArray()
    actors?: Array<{
        nombre: string;
        tipoPersona: string;
        identificacion?: string;
        rol: string;
        cargo?: string;
        email?: string;
        telefono?: string;
        direccion?: string;
        apoderado?: string;
    }>;
}
