import { Module } from '@nestjs/common';
import { BancoDocentesModule } from '../modules/banco-docentes/banco-docentes.module';
import { InternalRundController } from './internal-rund.controller';
import { InternalRundService } from './internal-rund.service';
import { InternalServiceGuard } from './internal-service.guard';
import { AuthIdentityModule } from '../common/auth-identity.client';
import { RundCatalogosModule } from '../common/rund-catalogos.client';

@Module({
  imports: [BancoDocentesModule, AuthIdentityModule, RundCatalogosModule],
  controllers: [InternalRundController],
  providers: [InternalRundService, InternalServiceGuard],
})
export class InternalModule {}
