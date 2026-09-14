import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/**
 * Registro de la publicacion del contrato (EFDS-1166).
 *
 * Viaja como multipart porque lleva la evidencia adjunta: sin soporte no hay
 * publicacion registrada, solo la afirmacion de que se hizo.
 */
export class PublicarContratoDto {
  /**
   * La historia habla de SECOP II y la matriz de la pagina web de la ESAP. Se
   * pide el destino en vez de suponer cual de las dos manda.
   */
  @ApiProperty({ description: 'Donde se publico', enum: ['SECOP_II', 'WEB_ESAP'] })
  @IsIn(['SECOP_II', 'WEB_ESAP'], {
    message: 'El destino de la publicacion es SECOP_II o WEB_ESAP',
  })
  destino: 'SECOP_II' | 'WEB_ESAP';

  /** La real, no la del registro: es la que cuenta para el plazo. */
  @ApiProperty({ description: 'Fecha real de la publicacion (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de publicacion debe tener el formato YYYY-MM-DD' })
  fechaPublicacion: string;

  @ApiPropertyOptional({ description: 'Numero del proceso en SECOP II' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  secopNumero?: string;

  @ApiPropertyOptional({ description: 'Enlace a la publicacion' })
  @IsOptional()
  @IsUrl({}, { message: 'El enlace de la publicacion no tiene un formato valido' })
  secopUrl?: string;
}
