import {
  IsString,
  IsEnum,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  IsIn,
  Matches,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { AutoType, AutoStatus, isValidAutoType } from '../entities/legal-auto.entity';

// Validador personalizado para tipos de auto
@ValidatorConstraint({ name: 'isValidAutoType', async: false })
export class IsValidAutoTypeConstraint implements ValidatorConstraintInterface {
  validate(tipo: string, args: ValidationArguments) {
    return isValidAutoType(tipo);
  }

  defaultMessage(args: ValidationArguments) {
    return `Tipo de auto inválido: ${args.value}. Debe ser un tipo válido o AUTO_APERTURA_{ETAPA} para aperturas dinámicas.`;
  }
}

export class CreateLegalAutoDto {
  @Matches(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  processId: string;

  @Validate(IsValidAutoTypeConstraint)
  tipoAuto: string;

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

  @IsOptional()
  @IsNumber()
  @IsIn([3, 6])
  prorrogaMeses?: number; // Solo para AUTO_PRORROGA: 3 o 6 meses
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
