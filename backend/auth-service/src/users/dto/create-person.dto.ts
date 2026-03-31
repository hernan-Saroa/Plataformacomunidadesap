import { Type } from 'class-transformer';
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
  @Type(() => Number)
  @IsNumber()
  idSeccional?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  idSede?: number;
}
