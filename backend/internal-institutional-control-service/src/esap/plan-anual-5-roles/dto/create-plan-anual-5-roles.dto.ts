import { IsInt, IsString, IsNotEmpty, IsOptional, Min, Max, IsUUID, IsDateString, IsArray } from 'class-validator';

export class CreatePlanAnual5RolesDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  año: number;

  @IsString()
  @IsNotEmpty()
  responsable: string;

  @IsOptional()
  @IsUUID()
  responsable_id?: string;

  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @IsOptional()
  @IsString()
  estado?: 'borrador' | 'en-revision' | 'aprobado' | 'en-ejecucion' | 'completado' | 'activo';

  @IsOptional()
  @IsArray()
  equipo_aprobacion?: any[];

  @IsOptional()
  @IsString()
  orden_aprobacion?: string;
}

