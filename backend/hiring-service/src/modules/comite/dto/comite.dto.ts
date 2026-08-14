import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class MiembroComiteDto {
  @ApiProperty({ description: 'id_person de la persona en el directorio' })
  @IsUUID('4', { message: 'Cada miembro se identifica con el id de la persona del directorio' })
  personaId: string;

  /**
   * El nombre viaja junto al id y no se resuelve en el servidor: es el que se
   * copia al expediente, y tiene que ser el que el gestor vio y eligió.
   */
  @ApiProperty({ description: 'Nombre de la persona tal como se designa en el memorando' })
  @IsString()
  @IsNotEmpty({ message: 'Cada miembro necesita el nombre con el que se le designa' })
  @MaxLength(200)
  nombre: string;

  @ApiProperty({ description: 'Dimensión que evalúa', enum: ['JURIDICO', 'FINANCIERO', 'TECNICO'] })
  @IsIn(['JURIDICO', 'FINANCIERO', 'TECNICO'], {
    message: 'El rol del miembro es JURIDICO, FINANCIERO o TECNICO',
  })
  rol: 'JURIDICO' | 'FINANCIERO' | 'TECNICO';
}

export class DesignarComiteDto {
  /** La del memorando, no la del registro: es cuando la entidad designó. */
  @ApiProperty({ description: 'Fecha del memorando de designación (YYYY-MM-DD)' })
  @IsDateString({}, { message: 'La fecha de designación debe tener el formato YYYY-MM-DD' })
  fechaDesignacion: string;

  /**
   * Llega como texto JSON dentro del multipart, porque la petición lleva
   * también el memorando y `FormData` no transporta arreglos de objetos.
   * `Transform` lo convierte antes de validar; sin eso `IsArray` rechazaría
   * siempre, porque lo que llega es un string.
   */
  @ApiProperty({
    description: 'Miembros del comité, como JSON',
    example: '[{"personaId":"...","nombre":"Ana Ruiz","rol":"JURIDICO"}]',
  })
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      // Se devuelve el string para que la validación lo rechace con un mensaje
      // de negocio, en vez de reventar aquí con un error de sintaxis.
      return value;
    }
  })
  @IsArray({ message: 'Los miembros deben venir como una lista' })
  @ArrayMinSize(1, { message: 'Un comité necesita al menos un miembro' })
  @ValidateNested({ each: true })
  @Type(() => MiembroComiteDto)
  miembros: MiembroComiteDto[];
}

export class RevocarComiteDto {
  @ApiProperty({ description: 'Por qué se revoca la designación' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por qué se revoca la designación' })
  @MinLength(10, { message: 'El motivo debe explicar la revocación, no una palabra suelta' })
  @MaxLength(1000)
  motivo: string;
}
