import { Module } from '@nestjs/common';
import { TravelExpensesController } from './travel-expenses.controller';
import { TravelExpensesService } from './travel-expenses.service';

@Module({
  controllers: [TravelExpensesController],
  providers: [TravelExpensesService],
  exports: [TravelExpensesService],
})
export class TravelExpensesModule {}
