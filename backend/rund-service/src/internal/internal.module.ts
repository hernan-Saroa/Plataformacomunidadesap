import { Module } from '@nestjs/common';
import { BancoDocentesModule } from '../modules/banco-docentes/banco-docentes.module';
import { InternalRundController } from './internal-rund.controller';
import { InternalRundService } from './internal-rund.service';
import { InternalServiceGuard } from './internal-service.guard';

@Module({
  imports: [BancoDocentesModule],
  controllers: [InternalRundController],
  providers: [InternalRundService, InternalServiceGuard],
})
export class InternalModule {}
