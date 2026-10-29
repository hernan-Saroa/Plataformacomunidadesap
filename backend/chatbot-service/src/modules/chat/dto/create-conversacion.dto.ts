import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateConversacionDto {
  @ApiPropertyOptional({ description: 'Título o tema de la conversación' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Matches(/\S/)
  titulo?: string;

  @ApiPropertyOptional({ description: 'Contexto de atención institucional', default: 'general' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  @Matches(/\S/)
  contexto?: string;
}
