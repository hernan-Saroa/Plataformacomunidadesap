import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
}
