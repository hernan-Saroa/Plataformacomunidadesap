import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class RequestSignatureOtpDto {
  @IsOptional()
  @IsString()
  @Matches(/^paz-y-salvo:[0-9a-f-]{36}:[0-9a-f]{64}$/)
  context?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  userName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  actionDetail?: string;
}
