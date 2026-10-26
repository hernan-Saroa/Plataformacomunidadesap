import { IsString, Matches, MaxLength, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMensajeDto {
  @ApiProperty({ description: 'Contenido del mensaje', example: '¿Cuáles son los requisitos de grado?' })
  @IsString()
  @Matches(/\S/)
  @MaxLength(2000)
  contenido: string;

  @ApiPropertyOptional({ description: 'Metadatos adicionales del mensaje' })
  @IsOptional()
  @IsObject()
  metadatos?: Record<string, any>;
}
