import { IsString, IsNotEmpty, Length } from 'class-validator';

export class DevolverAnalistaDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  motivo: string;
}
