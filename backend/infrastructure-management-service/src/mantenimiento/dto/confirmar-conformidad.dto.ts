import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ConfirmarConformidadDto {
  @ApiPropertyOptional({
    example: 'Gracias, todo quedó perfecto. Pintura y cerradura OK.',
    description:
      'Comentario adicional del área solicitante al confirmar conformidad. Opcional.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, {
    message: 'Comentarios no deben exceder 500 caracteres',
  })
  observacionesConformidad?: string;
}
