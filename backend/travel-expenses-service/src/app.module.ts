import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TravelExpensesModule } from './modules/travel-expenses/travel-expenses.module';

@Module({
  imports: [TravelExpensesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
