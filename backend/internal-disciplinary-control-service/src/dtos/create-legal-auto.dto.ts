import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { AutoType, AutoStatus } from '../entities/legal-auto.entity';

export class CreateLegalAutoDto {
  @IsUUID()
  processId: string;

  @IsEnum(AutoType)
  tipoAuto: AutoType;

  @IsString()
  contenidoHtml: string;

  @IsOptional()
  @IsString()
  comentarios?: string;
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
  contenido: string;
  estado: string;
  firmaUrl: string;
  comentarios: string;
  aprobadoPorId: string;
  createdAt: Date;
  updatedAt: Date;
}
