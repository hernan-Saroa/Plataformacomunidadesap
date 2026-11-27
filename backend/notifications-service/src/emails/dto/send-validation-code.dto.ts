import { IsEmail, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';

export class SendValidationCodeDto {
  @IsEmail()
  to: string;

  @IsString()
  @IsNotEmpty()
  @Length(4, 12)
  code: string;

  @IsString()
  @IsOptional()
  subject?: string;

  /** Evento y módulo en la configuración de notificaciones (EFDS-2406); ver SendEmailDto. */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  evento?: string;

  @IsString()
  @IsOptional()
  @MaxLength(60)
  modulo?: string;
}
