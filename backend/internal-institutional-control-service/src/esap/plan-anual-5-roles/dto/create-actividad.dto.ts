import { IsString, IsNotEmpty, IsDateString, IsInt, IsOptional, Min, Max, IsEnum } from 'class-validator';

export class CreateActividadDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsString()
  @IsNotEmpty()
  responsable: string;

  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;

  @IsOptional()
  @IsEnum(['pendiente', 'en-progreso', 'completada', 'retrasada'])
  estado?: 'pendiente' | 'en-progreso' | 'completada' | 'retrasada';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  porcentaje_avance?: number;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsEnum(['Alta', 'Media', 'Baja'])
  prioridad?: 'Alta' | 'Media' | 'Baja';
}

