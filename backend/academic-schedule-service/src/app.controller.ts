import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return this.appService.getHealth();
  }

  @Get()
  getHello() {
    return {
      message: 'API Microservicio de Programación Académica ESAP',
      version: '1.0.0',
    };
  }
}
