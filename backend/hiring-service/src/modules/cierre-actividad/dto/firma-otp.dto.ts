import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601, IsNotEmpty, IsString } from 'class-validator';

/**
 * Evidencia de la firma con el token institucional (EFDS-2070).
 *
 * La verificó el auth-service, no hiring: quien completa el OTP recibe de
 * vuelta `fechaFirma`, `metodo` e `id` bajo su propia sesión, y esto es lo que
 * la pantalla reenvía como comprobante de que ocurrió. Hiring no puede volver
 * a validar el código —ya se consumió al verificarlo—, así que lo único que
 * comprueba es que la evidencia tenga esta forma y sea reciente
 * (`CierreActividadService.exigirFirmaValida`).
 */
export class FirmaOtpDto {
  @ApiProperty({ description: 'Identificador que devolvió el auth-service al verificar el OTP' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ description: 'Momento en que se verificó el código OTP' })
  @IsISO8601()
  fechaFirma: string;

  @ApiProperty({ description: 'Método de firma', example: 'OTP_EMAIL' })
  @IsIn(['OTP_EMAIL'])
  metodo: string;
}
