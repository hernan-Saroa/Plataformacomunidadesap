import { IsString, IsNotEmpty, IsDateString, IsInt, IsOptional, Min, Max, IsEnum, IsBoolean, IsObject } from 'class-validator';

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

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMPOS NUEVOS - Migración 129
  // ═══════════════════════════════════════════════════════════════════════════

  @IsOptional()
  @IsString()
  control?: string;

  @IsOptional()
  @IsString()
  evaluacion?: string;

  @IsOptional()
  @IsString()
  seguimiento?: string;

  @IsOptional()
  @IsBoolean()
  requiereVerificacionDirector?: boolean;

  @IsOptional()
  @IsBoolean()
  verificadaPorDirector?: boolean;

  @IsOptional()
  @IsDateString()
  fechaVerificacion?: string;

  @IsOptional()
  @IsString()
  observacionesDirector?: string;

  @IsOptional()
  @IsObject()
  configuracionEvidencias?: {
    observaciones?: boolean;
    documentos?: boolean;
    adjuntosRequeridos: 'OBLIGATORIO' | 'OPCIONAL' | 'NO_REQUERIDO';
    observacionRequerida: 'OBLIGATORIO' | 'OPCIONAL' | 'NO_REQUERIDO';
    minimoAdjuntos?: number;
    tiposAdjuntosPermitidos?: string[];
    longitudMinimaObservacion?: number;
  };

  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}

