import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CrearProcesoDto {
  @ApiProperty({ description: 'Objeto a contratar', example: 'Adquisición de 50 equipos de cómputo' })
  @IsString()
  @IsNotEmpty({ message: 'El objeto del proceso es obligatorio' })
  @MaxLength(4000)
  objeto: string;
}

export class GuardarBorradorDto {
  @ApiProperty({
    description: 'Valores del formulario. Solo se aceptan códigos definidos en campos_formulario.',
    example: { objeto_contratar: 'Adquisición de equipos', valor_estimado: 78500000 },
  })
  @IsObject()
  datos: Record<string, any>;

  @ApiPropertyOptional({
    description:
      'Versión leída por el cliente. Si no coincide con la almacenada se responde 409 ' +
      'para no pisar cambios de otra sesión.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
}

export class RevisarDto {
  @ApiPropertyOptional({
    description:
      'Observaciones del revisor. Obligatorias al devolver: sin motivo el gestor ' +
      'no sabe qué corregir.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  observaciones?: string;
}

/** Campo que falta al intentar enviar (criterio 2 del HU). */
export class CampoFaltanteDto {
  @ApiProperty() codigo: string;
  @ApiProperty() etiqueta: string;
  @ApiPropertyOptional() grupo?: string;
}
