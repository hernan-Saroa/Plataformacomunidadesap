import { ParseUUIDPipe } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { AsignacionesController } from '../asignaciones/asignaciones.controller.js';
import { AulasController } from '../aulas/aulas.controller.js';
import { ConcertacionController } from '../concertacion/concertacion.controller.js';
import { GruposController } from '../grupos/grupos.controller.js';
import { HorariosController } from '../horarios/horarios.controller.js';
import { JefaturaController } from '../jefatura/jefatura.controller.js';
import { PortalDocenteController } from '../portal-docente/portal-docente.controller.js';
import { PublicacionController } from '../publicacion/publicacion.controller.js';
import { AlcanceService } from './alcance.service.js';

/**
 * Un id que no es UUID ('undefined', texto) responde 400, no 500: lo valida
 * ParseUUIDPipe en la ruta y el guard no lo lleva a la base.
 */
describe('ids UUID: 400 en vez de 500', () => {
  const PARAMS_UUID = new Set(['id', 'idFranja', 'idGrupo']);
  const controladores = [
    ConcertacionController, GruposController, HorariosController, JefaturaController,
    PortalDocenteController, PublicacionController, AsignacionesController, AulasController,
  ];

  it.each(controladores.map((c) => [c.name, c]))('%s: todo parámetro de id UUID pasa por ParseUUIDPipe', (_n, C: any) => {
    const sinPipe: string[] = [];
    for (const metodo of Object.getOwnPropertyNames(C.prototype)) {
      const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, C, metodo) ?? {};
      for (const arg of Object.values<any>(args)) {
        if (!PARAMS_UUID.has(arg.data)) continue;
        if (!(arg.pipes ?? []).some((p: any) => p === ParseUUIDPipe || p instanceof ParseUUIDPipe)) sinPipe.push(`${metodo}(${arg.data})`);
      }
    }
    expect(sinPipe).toEqual([]);
  });

  it('el guard no consulta la base con un id de grupo que no es UUID', async () => {
    const query = jest.fn();
    const alcance = new AlcanceService({ query } as any);
    expect(await alcance.resolver('grupo', 'undefined')).toEqual({ existe: false, periodo: null, nivel: null });
    expect(query).not.toHaveBeenCalled();
  });
});
