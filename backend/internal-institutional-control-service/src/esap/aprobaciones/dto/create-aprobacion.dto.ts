import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString } from 'class-validator';

export class CreateAprobacionDto {
  @IsEnum(['plan-auditoria', 'plan-mejora', 'informe', 'documento'])
  tipo: 'plan-auditoria' | 'plan-mejora' | 'informe' | 'documento';

  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  solicitante: string;

  @IsOptional()
  @IsDateString()
  fecha_solicitud?: string;

  @IsOptional()
  @IsEnum(['Alta', 'Media', 'Baja'])
  prioridad?: 'Alta' | 'Media' | 'Baja';

  @IsOptional()
  @IsString()
  territorial?: string;

  @IsOptional()
  @IsString()
  sede?: string;

  @IsOptional()
  @IsString()
  relacionado?: string;

  @IsOptional()
  @IsString()
  area?: string;
}

