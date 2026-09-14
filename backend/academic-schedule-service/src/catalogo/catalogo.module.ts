import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CatalogoController } from './catalogo.controller.js';
import { CatalogoService } from './catalogo.service.js';
import { ProgramacionPermissionsService } from '../auth/programacion-permissions.service.js';
import { ProgramaCatalogoEntity } from './entities/programa.readonly.entity.js';
import { AsignaturaCatalogoEntity } from './entities/asignatura.readonly.entity.js';
import { UbicacionSemestralCatalogoEntity } from './entities/ubicacion-semestral.readonly.entity.js';
import { CatalogoSniesSoloLecturaMiddleware } from '../comun/solo-lectura.middleware.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgramaCatalogoEntity,
      AsignaturaCatalogoEntity,
      UbicacionSemestralCatalogoEntity,
    ]),
  ],
  controllers: [CatalogoController],
  providers: [CatalogoService, ProgramacionPermissionsService],
})
export class CatalogoModule implements NestModule {
  /**
   * RN-02: los datos derivados del código de asignatura los define el SNIES y
   * ningún usuario puede modificarlos.
   *
   * Se aplica por PREFIJO y antes del enrutamiento, no como guard sobre las
   * rutas existentes: así una escritura se rechaza con un 403 explicado aunque
   * la ruta no exista, y sigue rechazándose el día que alguien agregue un POST
   * a este controlador.
   */
  configure(consumer: MiddlewareConsumer) {
    // Express 5 exige comodin NOMBRADO ('*splat'), no '*' suelto.
    consumer.apply(CatalogoSniesSoloLecturaMiddleware).forRoutes(
      { path: 'catalogo', method: RequestMethod.ALL },
      { path: 'catalogo/*splat', method: RequestMethod.ALL },
    );
  }
}
