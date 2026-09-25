import { Module } from '@nestjs/common';
import { PendientesService } from '../legalizacion/pendientes.service';
import { FirmaOtpClient } from './firma-otp.client';
import { PazYSalvoPdfService } from './paz-y-salvo-pdf.service';
import { PazYSalvoController } from './paz-y-salvo.controller';
import { PazYSalvoService } from './paz-y-salvo.service';

@Module({
  controllers: [PazYSalvoController],
  providers: [PendientesService, FirmaOtpClient, PazYSalvoPdfService, PazYSalvoService],
  exports: [PendientesService],
})
export class PazYSalvoModule {}
