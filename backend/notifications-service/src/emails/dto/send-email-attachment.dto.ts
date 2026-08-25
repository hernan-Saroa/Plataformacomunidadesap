import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
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
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => EmailAttachmentDto)
  @IsOptional()
  additionalAttachments?: EmailAttachmentDto[];
}
