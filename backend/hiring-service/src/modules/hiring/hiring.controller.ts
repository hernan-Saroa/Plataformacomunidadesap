import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { HiringService } from './hiring.service';
import { Public } from '../../auth/public.decorator';

@ApiTags('Contratación')
@Controller()
export class HiringController {
  constructor(private readonly hiringService: HiringService) {}

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Obtener estado del módulo de contratación' })
  getStatus() {
    return this.hiringService.getServiceStatus();
  }
}
