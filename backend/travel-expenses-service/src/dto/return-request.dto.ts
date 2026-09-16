import { IsString, Length, IsNotEmpty } from 'class-validator';

export class ReturnRequestDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 1000)
  motivo: string;
}
