import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateDisciplinaryProcessNoteDto {
  @IsString()
  @IsNotEmpty()
  texto: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  etapa?: string;
}
