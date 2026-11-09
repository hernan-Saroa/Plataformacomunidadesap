import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class EmailAttachmentDto {
  @IsString()
  @IsNotEmpty()
  filename: string;

  @IsString()
  @IsNotEmpty()
  contentBase64: string;

  @IsString()
  @IsOptional()
  contentType?: string;
}

export class SendEmailDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsOptional()
  text?: string;

  @IsString()
  @IsOptional()
  html?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  @IsOptional()
  attachments?: EmailAttachmentDto[];

  /**
   * Evento y módulo en la configuración de notificaciones (EFDS-2406). Con
   * `evento`, el correo pasa por la compuerta igual que la campana; sin él es
   * un correo del sistema y sale siempre.
   */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  evento?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  modulo?: string;
}
