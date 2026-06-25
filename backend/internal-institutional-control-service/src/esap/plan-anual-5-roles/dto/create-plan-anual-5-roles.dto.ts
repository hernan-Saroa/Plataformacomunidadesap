import { IsInt, IsString, IsNotEmpty, IsOptional, Min, Max, Matches, IsDateString, IsArray } from 'class-validator';

const POSTGRES_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class CreatePlanAnual5RolesDto {
  @IsInt()
  @Min(2020)
  @Max(2100)
  año: number;

  @IsString()
  @IsNotEmpty()
  responsable: string;

  @IsOptional()
  @Matches(POSTGRES_UUID_RE, { message: 'responsable_id must be a UUID' })
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

