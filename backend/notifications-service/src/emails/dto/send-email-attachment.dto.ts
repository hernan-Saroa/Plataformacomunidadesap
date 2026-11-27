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
import { EmailAttachmentDto } from './send-email.dto';

export class SendEmailAttachmentDto {
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

  @IsString()
  @IsNotEmpty()
  attachmentName: string;

  @IsString()
  @IsNotEmpty()
  attachmentBase64: string;

  @IsString()
  @IsOptional()
  attachmentContentType?: string;

  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  @IsOptional()
  additionalAttachments?: EmailAttachmentDto[];

  /**
   * Evento y módulo en la configuración de notificaciones (EFDS-2406). Con
   * `evento`, el correo con adjunto pasa por la compuerta igual que los demás;
   * sin él sale siempre.
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
