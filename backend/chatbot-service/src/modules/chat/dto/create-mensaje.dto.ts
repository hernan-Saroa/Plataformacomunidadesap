import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMensajeDto {
  @ApiProperty({ description: 'Contenido del mensaje', example: '¿Cuáles son los requisitos de grado?' })
  @IsString()
  @IsNotEmpty()
  contenido: string;

  @ApiPropertyOptional({ description: 'Rol del remitente', enum: ['user', 'assistant', 'system'], default: 'user' })
  @IsOptional()
  @IsIn(['user', 'assistant', 'system'])
  rol?: 'user' | 'assistant' | 'system';

  @ApiPropertyOptional({ description: 'Metadatos adicionales del mensaje' })
  @IsOptional()
  metadatos?: Record<string, any>;
}
