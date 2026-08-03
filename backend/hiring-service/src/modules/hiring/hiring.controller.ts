import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HiringService } from './hiring.service';

@ApiTags('Contratación')
@Controller()
export class HiringController {
  constructor(private readonly hiringService: HiringService) {}

  @Get('status')
  @ApiOperation({ summary: 'Obtener estado del módulo de contratación' })
  getStatus() {
    return this.hiringService.getServiceStatus();
  }
}
