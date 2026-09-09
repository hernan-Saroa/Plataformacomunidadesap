import { ApiProperty } from '@nestjs/swagger';

export class SiifExportResponseDto {
  @ApiProperty({ description: 'Contenido CSV generado para SIIF' })
  csvContent: string;

  @ApiProperty({ description: 'Nombre del archivo descargable' })
  fileName: string;

  @ApiProperty({ description: 'URL de descarga del CSV' })
  downloadUrl: string;
}
