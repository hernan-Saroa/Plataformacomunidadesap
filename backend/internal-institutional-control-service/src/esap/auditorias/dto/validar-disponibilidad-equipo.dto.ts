import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class ValidarDisponibilidadEquipoDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  equipoAuditores?: string[];

  @IsDateString()
  fechaInicio: string;

  @IsDateString()
  fechaFin: string;

  @IsUUID()
  @IsOptional()
  excludeAuditoriaId?: string;
}
