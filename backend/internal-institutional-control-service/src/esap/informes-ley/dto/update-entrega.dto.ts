import {
  IsString,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  Length,
  IsNumber,
} from 'class-validator';

export class UpdateEntregaDto {
  @IsUUID()
  @IsOptional()
  informeId?: string;

  @IsString()
  @IsOptional()
  @Length(1, 50)
  periodo?: string;

  @IsDateString()
  @IsOptional()
  fechaVencimiento?: string;

  @IsDateString()
  @IsOptional()
  fechaEntrega?: string;

  @IsEnum(['pendiente', 'en-proceso', 'entregado', 'vencido', 'rechazado'])
  @IsOptional()
  estado?: 'pendiente' | 'en-proceso' | 'entregado' | 'vencido' | 'rechazado';

  @IsString()
  @IsOptional()
  @Length(0, 255)
  archivoNombre?: string;

  @IsString()
  @IsOptional()
  @Length(0, 500)
  archivoUrl?: string;

  @IsNumber()
  @IsOptional()
  archivoTamano?: number;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  elaboradoPor?: string;

  @IsDateString()
  @IsOptional()
  fechaElaboracion?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  aprobadoPor?: string;

  @IsDateString()
  @IsOptional()
  fechaAprobacion?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  enviadoPor?: string;

  @IsString()
  @IsOptional()
  @Length(0, 255)
  numeroRadicado?: string;

  @IsDateString()
  @IsOptional()
  fechaRadicacion?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsString()
  @IsOptional()
  motivoRechazo?: string;
}
