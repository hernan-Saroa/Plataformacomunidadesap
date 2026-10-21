import { ApiProperty } from '@nestjs/swagger';
import { plainToInstance, Transform } from 'class-transformer';
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

/**
 * La firma cuando llega como texto JSON dentro de un multipart.
 *
 * `plainToInstance` y no `JSON.parse` a secas: el resultado del Transform es
 * el valor final, `@Type` ya no lo convierte, y sin una instancia real el
 * `whitelist` del ValidationPipe la despoja de todos sus campos. Llegaba como
 * `{}`, sin `fechaFirma`, y `exigirFirmaValida` la daba por expirada aunque se
 * acabara de verificar.
 */
export const FirmaDelMultipart = () =>
  Transform(({ value }) =>
    typeof value === 'string' ? plainToInstance(FirmaOtpDto, JSON.parse(value)) : value,
  );
