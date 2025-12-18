import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class NewPersonDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsString()
  documentNumber: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  roles?: string[];
}
