import { Module } from '@nestjs/common';

import { ValidacionController } from './validacion.controller.js';
import { ValidacionService } from './validacion.service.js';

@Module({
  controllers: [ValidacionController],
  providers: [ValidacionService],
  exports: [ValidacionService],
})
export class ValidacionModule {}
