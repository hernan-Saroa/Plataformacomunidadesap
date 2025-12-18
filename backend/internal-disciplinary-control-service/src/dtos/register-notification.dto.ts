import { IsDateString, IsNotEmpty, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterNotificationDto {
    @ApiProperty({
        description: 'Fecha de notificación al disciplinado',
        example: '2023-11-20T10:00:00Z',
    })
    @IsDateString()
    @IsNotEmpty()
    notificationDate: string;

    @ApiProperty({
        description: 'URL de la evidencia (PDF/Imagen) de la notificación',
        example: '/uploads/notificacion_firmada.pdf',
    })
    @IsString()
    @IsOptional()
    notificationEvidence?: string;
}
