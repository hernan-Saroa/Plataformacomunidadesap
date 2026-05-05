import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateDisciplinaryBehaviorDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  codigo: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  orden?: number;
}

export class UpdateDisciplinaryBehaviorDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  codigo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsBoolean()
  estado?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  orden?: number;
}