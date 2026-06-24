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

  @IsOptional()
  @IsString()
  auditorId?: string;

  // ═══════════════════════════════════════════════════════════════
  // ENTRADAS DE SEGUIMIENTO
  // ═══════════════════════════════════════════════════════════════

  @IsOptional()
  entradas_seguimiento?: Array<{
    id: string;
    puntoControlId: string;
    fechaRegistro: string;
    registradoPor: string;
    usuarioId?: string;
    texto?: string;
    archivos?: Array<{
      nombre: string;
      url: string;
      tipo: string;
      tamanio: number;
    }>;
    tipo: 'seguimiento' | 'hallazgo' | 'cierre';
  }>;

  // ═══════════════════════════════════════════════════════════════
  // PUNTOS DE CONTROL Y FRECUENCIA
  // ═══════════════════════════════════════════════════════════════

  @IsOptional()
  puntos_control?: Array<{
    id: string;
    orden: number;
    nombre: string;
    descripcion?: string;
    fechaProgramada: string;
    fechaReal: string | null;
    responsable: string;
    estado: 'pendiente' | 'en-progreso' | 'completado' | 'omitido';
    observaciones?: string;
    evidencias?: any[];
  }>;

  @IsOptional()
  @IsString()
  frecuencia_puntos_control?: string;

  @IsOptional()
  responsables?: Array<{ id: string; nombre: string; cargo: string; email: string }>;

  @IsOptional()
  @IsString()
  fecha_corte?: string;

  // ═══════════════════════════════════════════════════════════════
  // TAREAS DE SEGUIMIENTO - sub-tareas de la actividad
  // ═══════════════════════════════════════════════════════════════

  @IsOptional()
  tareas_seguimiento?: Array<{
    id: string;
    descripcion: string;
    completada: boolean;
    responsables?: Array<{ id: string; nombre: string; cargo?: string }>;
    fechaLimite?: string;
    fechaCompletada?: string;
    completadaPor?: string;
    puntoControlId?: string;
    requiereAdjuntos?: boolean;
    requiereObservaciones?: boolean;
    observaciones?: string;
    adjuntosTarea?: unknown[];
  }>;
}

