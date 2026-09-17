import { IsString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversacionDto {
  @ApiPropertyOptional({ description: 'Título o tema de la conversación' })
  @IsString()
  @IsOptional()
  titulo?: string;

  @ApiPropertyOptional({ description: 'Contexto de atención institucional', default: 'general' })
  @IsString()
  @IsOptional()
  contexto?: string;

  @ApiPropertyOptional({ description: 'ID del usuario autenticado' })
  @IsUUID()
  @IsOptional()
  usuarioId?: string;

  @ApiPropertyOptional({ description: 'Email del usuario autenticado' })
  @IsString()
  @IsOptional()
  usuarioEmail?: string;

  @ApiPropertyOptional({ description: 'Nombre completo del usuario autenticado' })
  @IsString()
  @IsOptional()
  usuarioNombre?: string;
}
