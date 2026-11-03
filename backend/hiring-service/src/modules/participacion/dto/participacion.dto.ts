import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** Motivo de un cambio: relevar a alguien o dejar un puesto vacío. */
export class MotivoDto {
  @ApiProperty({ description: 'Por qué cambia de manos' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué cambia el responsable' })
  @MinLength(10, { message: 'El motivo debe explicar el cambio, no una palabra suelta' })
  @MaxLength(1000)
  motivo: string;
}

/**
 * A quién se pone en un puesto del proceso (109).
 *
 * Viaja solo el `id_user` de la cuenta y el servidor resuelve el resto contra
 * el directorio: un username inventado por el cliente no fallaría ninguna
 * validación y dejaría el puesto en manos de una cuenta que nunca lo verá. El
 * motivo se exige al cambiar a quien ya estaba, no al asignar por primera vez.
 */
export class AsignarPuestoDto {
  @ApiProperty({ description: 'id_user de la cuenta que ocupa el puesto en este proceso' })
  @IsUUID('4', { message: 'La persona se identifica con el id de su cuenta' })
  usuarioId: string;

  @ApiPropertyOptional({ description: 'Por qué se cambia a quien ocupaba el puesto' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  motivo?: string;
}

/** Un puesto del proceso, tal como se configura. */
export class GuardarPuestoDto {
  @ApiProperty({ example: 'Abogado' })
  @IsString()
  @MinLength(3, { message: 'El puesto necesita un nombre de al menos tres letras' })
  @MaxLength(120)
  nombre: string;

  @ApiPropertyOptional({ example: 'Revisa el estudio previo y elige la causal' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string | null;

  @ApiPropertyOptional({ description: 'Si un proceso recibido sin nadie en el puesto genera alerta' })
  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}

/** Lo que se cambia de un puesto: cualquiera de sus datos. */
export class ActualizarPuestoDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'El puesto necesita un nombre de al menos tres letras' })
  @MaxLength(120)
  nombre?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  descripcion?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  obligatorio?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number;
}
