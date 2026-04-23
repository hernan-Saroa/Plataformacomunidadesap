import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RequestSignatureOtpDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  userName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  actionDetail?: string;
}
