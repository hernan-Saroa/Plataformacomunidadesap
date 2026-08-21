import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TravelExpensesService, type SolicitudViaticoEntity } from './travel-expenses.service';

@Controller('solicitudes')
export class TravelExpensesController {
  constructor(private readonly service: TravelExpensesService) {}

  @Get()
  findAll(): SolicitudViaticoEntity[] {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): SolicitudViaticoEntity | undefined {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: Record<string, any>): SolicitudViaticoEntity {
    return this.service.create(dto);
  }
}
