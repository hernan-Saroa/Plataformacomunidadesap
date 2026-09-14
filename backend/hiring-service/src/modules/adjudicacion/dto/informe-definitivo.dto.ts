import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class PublicarDefinitivoDto {
  /**
   * Dónde y cómo se publicó.
   *
   * No hay integración con SECOP II: lo que prueba la publicación es este texto
   * más el soporte que se adjunta, igual que en el traslado del preliminar.
   */
  @ApiProperty({ description: 'Dónde se publicó el informe definitivo' })
  @IsString()
  @IsNotEmpty({ message: 'Di dónde se publicó el informe definitivo' })
  @MinLength(10, { message: 'Describe la publicación: una palabra no la prueba' })
  @MaxLength(500)
  medioPublicacion: string;
}

export class AnularDefinitivoDto {
  @ApiProperty({ description: 'Motivo de la anulación del informe definitivo' })
  @IsString()
  @IsNotEmpty({ message: 'Di por qué se anula el informe definitivo' })
  @MinLength(10, { message: 'El motivo de la anulación tiene que explicarse' })
  @MaxLength(1000)
  motivo: string;
}
