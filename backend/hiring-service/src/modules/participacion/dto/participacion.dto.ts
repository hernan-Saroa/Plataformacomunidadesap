import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * A quien se le asigna el papel de abogado del proceso (EFDS-1183).
 *
 * Viaja solo el `id_user` de la cuenta, y el servidor resuelve contra
 * auth."user" el username, el nombre y el correo. Es lo contrario de lo que
 * hace la designacion del supervisor, que si acepta el nombre del cliente, y la
 * diferencia es deliberada: alli el nombre es el que dijo el acto
 * administrativo y el expediente tiene que conservarlo tal cual; aqui el dato
 * que importa es el username, porque es con el que los listados deciden a quien
 * le toca el proceso. Un username inventado por el cliente no rompe ninguna
 * validacion: deja el proceso asignado a una cuenta que nunca lo vera.
 */
export class AsignarAbogadoDto {
  @ApiProperty({ description: 'id_user de la cuenta que va a revisar el proceso' })
  @IsUUID('4', { message: 'El abogado se identifica con el id de su cuenta' })
  usuarioId: string;
}

/** Motivo del cambio. Comun a quitar y a reasignar. */
export class MotivoDto {
  @ApiProperty({ description: 'Por que cambia de manos' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que cambia el responsable' })
  @MinLength(10, { message: 'El motivo debe explicar el cambio, no una palabra suelta' })
  @MaxLength(1000)
  motivo: string;
}

/**
 * Reasignacion del proceso a otro abogado.
 *
 * Releva al vigente y asigna al nuevo en un solo acto, como la reasignacion de
 * la supervision (EFDS-1169): en dos pasos el proceso se queda sin revisor
 * entre uno y otro, y si el segundo falla queda asi indefinidamente.
 */
export class ReasignarAbogadoDto extends AsignarAbogadoDto {
  @ApiProperty({ description: 'Por que se cambia de abogado' })
  @IsString()
  @IsNotEmpty({ message: 'Explica por que se reasigna el proceso' })
  @MinLength(10, { message: 'El motivo debe explicar el cambio, no una palabra suelta' })
  @MaxLength(1000)
  motivo: string;
}
