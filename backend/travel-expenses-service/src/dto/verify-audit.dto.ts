import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class VerifyAuditDto {
  @IsBoolean()
  @IsOptional()
  seguridadSocialVigente?: boolean;

  @IsBoolean()
  @IsOptional()
  consultaRutFacturador?: boolean;

  @IsString()
  @IsOptional()
  otp?: string;

  @IsString()
  @IsOptional()
  verificationId?: string;

  @IsString()
  @IsOptional()
  certificadoId?: string;

  @IsString()
  @IsOptional()
  hashSha256?: string;

  @IsString()
  @IsOptional()
  firmaImagen?: string;

  @IsString()
  @IsOptional()
  nombreAnalista?: string;

  @IsString()
  @IsOptional()
  cargoAnalista?: string;
}
