import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';

import { FirmaOtpDto } from '../../cierre-actividad/dto/firma-otp.dto';

/**
 * La causal que el abogado elige para el proceso — actividad 3.6.
 *
 * Solo el codigo: cual corresponde depende de la modalidad del proceso, y
 * dejar que el cliente mandara tambien la modalidad permitiria elegir una
 * causal contra una modalidad que el proceso no tiene. El servicio la resuelve
 * del expediente.
 */
export class ElegirCausalDto {
  @ApiProperty({ description: 'Código de la causal, del catálogo de la modalidad' })
  @IsString()
  @IsNotEmpty({ message: 'Elige la causal que habilita contratar por esta modalidad' })
  @MaxLength(60)
  causal: string;

  /**
   * Por que el objeto encaja en esa causal.
   *
   * Opcional a proposito: la causal es el dato que la matriz pide y el que se
   * puede filtrar y contar. Esto es la motivacion, que alimenta el acto
   * administrativo de justificacion de la directa; exigirla en las once
   * modalidades seria inventar un requisito que el requerimiento no pide.
   *
   * Reemplaza al anterior, como todo lo que viaja en un PUT: mandar la causal
   * sin el sustento lo borra. La pantalla reenvia el que ya habia, asi que
   * rectificar la causal no se lleva por delante la motivacion escrita.
   */
  @ApiProperty({ required: false, description: 'Por qué el objeto encaja en esa causal' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sustento?: string;

  @ApiPropertyOptional({ description: 'Evidencia de la firma OTP, si la actividad la exige' })
  @IsOptional()
  @ValidateNested()
  @Type(() => FirmaOtpDto)
  firma?: FirmaOtpDto;
}
