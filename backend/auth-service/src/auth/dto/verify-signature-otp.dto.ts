import { IsOptional, IsString, Matches } from 'class-validator';

export class VerifySignatureOtpDto {
  @IsOptional()
  @IsString()
  @Matches(/^paz-y-salvo:[0-9a-f-]{36}:[0-9a-f]{64}$/)
  context?: string;

  @IsString()
  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  code: string;
}
