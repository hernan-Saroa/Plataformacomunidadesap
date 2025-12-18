import { IsString, IsNotEmpty, IsDateString, IsInt, IsOptional, IsEnum, Min, Max } from 'class-validator';

export class CreateAuditoriaGestionDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  tipo: string;

  @IsOptional()
  @IsEnum(['planeacion', 'en-curso', 'revision', 'completada'])
  fase?: 'planeacion' | 'en-curso' | 'revision' | 'completada';

  @IsOptional()
  @IsString()
  territorial?: string;

  @IsOptional()
  @IsString()
  sede?: string;

  @IsString()
  @IsNotEmpty()
  responsable: string;

  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progreso?: number;

  @IsOptional()
  @IsEnum(['Alta', 'Media', 'Baja'])
  prioridad?: 'Alta' | 'Media' | 'Baja';

  @IsOptional()
  @IsString()
  auditoria_programada_id?: string;
}

