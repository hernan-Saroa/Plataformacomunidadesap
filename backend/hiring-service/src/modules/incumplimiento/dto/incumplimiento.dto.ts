import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

/** Reporte de un presunto incumplimiento (EFDS-1180, RF-INC-01). */
export class ReportarIncumplimientoDto {
  @ApiProperty({ description: 'Qué se observó' })
  @IsString()
  @IsNotEmpty({ message: 'Describe qué se observó' })
  // Diez y no cinco como en el seguimiento: esto es lo que el area juridica lee
  // para decidir si abre tramite, y «no cumplio» no le sirve de nada.
  @MinLength(10, {
    message: 'El motivo debe decir qué se observó, no una palabra suelta',
  })
  @MaxLength(2000)
  motivo: string;

  /** La del hecho, no la del reporte: de ella cuelgan los terminos del tramite. */
  @ApiProperty({ description: 'Fecha del hecho (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha del hecho debe tener el formato YYYY-MM-DD' })
  fechaHecho: string;
}
