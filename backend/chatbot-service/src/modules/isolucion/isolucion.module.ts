import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IsolucionService, ISOLUCION_SQL } from './isolucion.service';

@Module({
  imports: [ConfigModule],
  providers: [IsolucionService, { provide: ISOLUCION_SQL, useFactory: () => require('mssql') }],
  exports: [IsolucionService],
})
export class IsolucionModule {}
