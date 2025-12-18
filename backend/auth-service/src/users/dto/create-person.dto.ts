import { IsString, IsEmail, IsOptional, IsArray, IsUUID, IsNumber } from 'class-validator';

export class CreatePersonDto {
  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsString()
  identification_number: string;

  @IsString()
  identification_type: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  roleIds?: string[];

  @IsOptional()
  @IsNumber()
  idSeccional?: number;

  @IsOptional()
  @IsNumber()
  idSede?: number;
}