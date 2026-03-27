import {
  IsString,
  IsBoolean,
  IsOptional,
  IsUUID,
  IsInt,
  MaxLength,
} from 'class-validator';
import { ApiProperty, PartialType } from '@nestjs/swagger';

export class CreateTipoRemisionDto {
  @ApiProperty({ description: 'Código único del tipo de remisión' })
  @IsString()
  @MaxLength(100)
  codigo: string;

  @ApiProperty({ description: 'Nombre del tipo de remisión' })
  @IsString()
  @MaxLength(255)
  nombre: string;

  @ApiProperty({
    description: 'Descripción del tipo de remisión',
    required: false,
  })
  @IsOptional()
  @IsString()
  descripcion?: string;

  @ApiProperty({ description: 'Orden de visualización', required: false })
  @IsOptional()
  @IsInt()
  orden?: number;
}

export class UpdateTipoRemisionDto extends PartialType(CreateTipoRemisionDto) {
  @ApiProperty({ description: 'ID del tipo de remisión', required: false })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ description: 'Si el tipo está activo', required: false })
  @IsOptional()
  @IsBoolean()
  activo?: boolean;
}
