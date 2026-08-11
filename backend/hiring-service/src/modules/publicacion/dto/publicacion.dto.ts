import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class RegistrarPublicacionDto {
  /**
   * La fecha real en que el pliego quedó publicado, no la del registro: es la
   * que arranca el plazo legal, y el usuario puede estar registrando días
   * después algo que ya ocurrió.
   */
  @ApiProperty({
    description: 'Fecha real de publicación en SECOP II (YYYY-MM-DD)',
    example: '2026-09-07',
  })
  @IsISO8601({ strict: true }, { message: 'La fecha debe tener formato YYYY-MM-DD' })
  fechaPublicacion: string;

  @ApiPropertyOptional({
    description: 'Número del proceso en SECOP II',
    example: 'LP-ESAP-004-2026',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  secopNumero?: string;

  /**
   * Sin integración, el enlace es lo que permite verificar la publicación desde
   * el expediente sin salir a buscarla a mano.
   */
  @ApiPropertyOptional({
    description: 'Enlace al proceso publicado en SECOP II',
    example: 'https://community.secop.gov.co/Public/Tendering/...',
  })
  @IsOptional()
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'El enlace de SECOP II debe ser una URL válida' },
  )
  @MaxLength(1000)
  secopUrl?: string;
}

export class AnularPublicacionDto {
  /**
   * Obligatorio: una publicación anulada sin motivo deja el expediente con dos
   * registros y sin forma de saber cuál valía ni por qué se corrigió.
   */
  @ApiProperty({ description: 'Motivo de la anulación' })
  @IsString()
  @IsNotEmpty({ message: 'El motivo de la anulación es obligatorio' })
  motivo: string;
}
