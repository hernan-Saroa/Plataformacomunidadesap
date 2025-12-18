import { IsString, IsNotEmpty, IsEnum, IsOptional, IsBoolean, IsObject, IsUrl } from 'class-validator';
import { TipoNotificacion, CanalNotificacion, PrioridadNotificacion } from '../entities/notificacion.entity';

export class CreateNotificacionDto {
  @IsString()
  @IsNotEmpty()
  usuarioId: string;

  @IsEnum(TipoNotificacion)
  @IsNotEmpty()
  tipoNotificacion: TipoNotificacion;

  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  mensaje: string;

  @IsOptional()
  @IsEnum(CanalNotificacion)
  canal?: CanalNotificacion;

  @IsOptional()
  @IsEnum(PrioridadNotificacion)
  prioridad?: PrioridadNotificacion;

  @IsOptional()
  @IsObject()
  metadata?: {
    auditoriaId?: string;
    hallazgoId?: string;
    planMejoramientoId?: string;
    documentoId?: string;
    fechaVencimiento?: string;
    diasAnticipacion?: number;
    [key: string]: any;
  };

  @IsOptional()
  @IsUrl()
  accionUrl?: string;
}

