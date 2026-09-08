import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';
import { Public } from './auth/public.decorator.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public()
  getHello(): { service: string; status: string; timestamp: string } {
    return this.appService.getHealth();
  }

  @Get('health')
  @Public()
  getHealth(): { service: string; status: string; timestamp: string } {
    return this.appService.getHealth();
  }
}
