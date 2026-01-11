import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, IsObject } from 'class-validator';
import { TipoEventoTimeline } from '../entities/evento-timeline.entity';

export class CreateEventoTimelineDto {
  @IsEnum(TipoEventoTimeline)
  @IsNotEmpty()
  tipo: TipoEventoTimeline;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsUUID()
  @IsOptional()
  usuarioId?: string;

  @IsString()
  @IsOptional()
  usuarioNombre?: string;

  @IsObject()
  @IsOptional()
  metadata?: any;
}
