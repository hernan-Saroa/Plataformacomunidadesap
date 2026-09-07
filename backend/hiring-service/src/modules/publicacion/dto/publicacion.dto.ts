import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
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

export class GuardarPlazoDto {
  @ApiProperty({
    description: 'Días hábiles de publicidad que aplican a la modalidad',
    example: 10,
  })
  @IsInt({ message: 'El plazo debe ser un número entero de días' })
  @Min(1, { message: 'El plazo debe ser de al menos un día hábil' })
  @Max(365, { message: 'Un plazo de publicidad de más de un año no es plausible' })
  diasHabiles: number;

  /**
   * De dónde sale la cifra. Se pide al confirmar porque un plazo sin respaldo
   * documental no se puede defender ante un ente de control, y porque dentro de
   * un año nadie recordará si el número vino del decreto o de un supuesto.
   */
  @ApiPropertyOptional({
    description: 'Norma o acta que respalda el plazo',
    example: 'Decreto 1082 de 2015, art. 2.2.1.1.2.1.4',
  })
  @IsOptional()
  @IsString()
  fundamento?: string;

  @ApiPropertyOptional({
    description: 'Marca el plazo como validado por la Dirección de Contratación',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  confirmado?: boolean;
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
