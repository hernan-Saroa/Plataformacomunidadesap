import { Controller, Get, Post, Param, Body, Res } from '@nestjs/common';
import { BackofficeDashboardService } from './backoffice-dashboard.service';
import { Public } from '../auth/decorators/public.decorator';
import type { Response } from 'express';

@Controller('backoffice/dashboard')
export class BackofficeDashboardController {
  constructor(private readonly service: BackofficeDashboardService) {}

  @Get('executive-stats')
  getExecutiveStats() {
    return this.service.getExecutiveStats();
  }

  @Public()
  @Get('templates/:name')
  async getTemplate(@Param('name') name: string, @Res() res: Response) {
    const html = await this.service.getDashboardTemplate(name);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(html);
  }

  @Public()
  @Post('templates/:name')
  async uploadTemplate(
    @Param('name') name: string,
    @Body() body: { html: string },
  ) {
    return this.service.updateDashboardTemplate(name, body?.html);
  }
}
