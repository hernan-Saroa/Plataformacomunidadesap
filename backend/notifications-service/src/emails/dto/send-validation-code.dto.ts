import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

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
}
