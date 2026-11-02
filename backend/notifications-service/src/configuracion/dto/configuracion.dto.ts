import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CANALES, PRIORIDADES } from '../entities/configuracion.entities';

export class ActualizarModuloDto {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @IsIn(CANALES)
  canal_defecto?: 'plataforma' | 'correo' | 'ambos';

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;
}

export class ActualizarEventoDto {
  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  /** null vuelve a heredar el canal del módulo. */
  @IsOptional()
  @IsIn([...CANALES, null])
  canal?: 'plataforma' | 'correo' | 'ambos' | null;

  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  /** null vuelve a la prioridad que trae el código. */
  @IsOptional()
  @IsIn([...PRIORIDADES, null])
  prioridad?: 'Baja' | 'Media' | 'Alta' | 'Crítica' | null;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  roles_adicionales?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  dependencias_adicionales?: number[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  sedes_adicionales?: number[];
}
