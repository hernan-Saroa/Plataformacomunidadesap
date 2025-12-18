import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsOptional,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateEntregaDto {
  @IsUUID()
  @IsNotEmpty()
  informeId: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  periodo: string; // "2025-01", "2025-Q1", "2025-S1", "2025"

  @IsDateString()
  @IsNotEmpty()
  fechaVencimiento: string;

  @IsOptional()
  @IsDateString()
  fechaEntrega?: string;

  @IsOptional()
  @IsEnum(['pendiente', 'en-proceso', 'entregado', 'vencido', 'rechazado'])
  estado?: 'pendiente' | 'en-proceso' | 'entregado' | 'vencido' | 'rechazado';

  @IsOptional()
  @IsString()
  @Length(0, 255)
  archivoNombre?: string;

  @IsOptional()
  @IsString()
  @Length(0, 500)
  archivoUrl?: string;

  @IsOptional()
  archivoTamano?: number;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  elaboradoPor?: string;

  @IsOptional()
  @IsDateString()
  fechaElaboracion?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  aprobadoPor?: string;

  @IsOptional()
  @IsDateString()
  fechaAprobacion?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  enviadoPor?: string;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  numeroRadicado?: string;

  @IsOptional()
  @IsDateString()
  fechaRadicacion?: string;

  @IsOptional()
  @IsString()
  observaciones?: string;

  @IsOptional()
  @IsString()
  motivoRechazo?: string;
}












