import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Matches,
} from 'class-validator';
import { AutoType, AutoStatus } from '../entities/legal-auto.entity';

export class CreateLegalAutoDto {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  processId: string;

  @IsEnum(AutoType)
  tipoAuto: AutoType;

  @IsOptional()
  @IsString()
  contenidoHtml?: string;

  @IsOptional()
  @IsString()
  numero?: string;

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsOptional()
  @IsString()
  documentName?: string;

  @IsOptional()
  @IsString()
  documentType?: string;

  @IsOptional()
  @IsNumber()
  documentSize?: number;

  @IsOptional()
  @IsString()
  comentarios?: string;

  @IsOptional()
  @IsString()
  etapaDestino?: string;
}

export class UpdateAutoStatusDto {
  @IsEnum(AutoStatus)
  estado: AutoStatus;

  @IsOptional()
  @IsString()
  comentarios?: string;

  @IsOptional()
  @IsString()
  tipoFirma?: string; // ELECTRONICA, DIGITAL, etc.
}

export class LegalAutoResponseDto {
  id: string;
  processId: string;
  tipo: string;
  numero?: string;
  contenido: string;
  estado: string;
  firmaUrl: string;
  documentUrl?: string;
  documentName?: string;
  documentType?: string;
  documentSize?: number;
  comentarios: string;
  aprobadoPorId: string;
  createdAt: Date;
  updatedAt: Date;
}
