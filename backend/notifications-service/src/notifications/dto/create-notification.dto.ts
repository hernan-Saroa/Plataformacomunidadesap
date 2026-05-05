import { IsString, IsOptional, IsBoolean, IsIn, IsObject } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  id_usuario_destinatario: string;

  @IsString()
  tipo_notificacion: string;

  @IsString()
  titulo: string;

  @IsString()
  mensaje: string;

  @IsOptional()
  @IsString()
  descripcion_corta?: string;

  @IsOptional()
  @IsString()
  icono?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsIn(['Baja', 'Media', 'Alta', 'Crítica'])
  prioridad?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsBoolean()
  tiene_accion?: boolean;

  @IsOptional()
  @IsString()
  texto_boton_accion?: string;

  @IsOptional()
  @IsString()
  url_accion?: string;

  @IsOptional()
  @IsObject()
  datos_adicionales?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  enviar_email?: boolean;
}
