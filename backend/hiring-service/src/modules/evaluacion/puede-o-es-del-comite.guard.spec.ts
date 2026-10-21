import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Alcance } from '../../auth/alcance';
import { AlcanceService } from '../../auth/alcance.service';
import { PermisosService } from '../../auth/permisos.service';
import { ComiteService } from '../comite/comite.service';
import { PuedeOEsDelComite, PuedeOEsDelComiteGuard } from './puede-o-es-del-comite.guard';

@Controller('procesos/:id/evaluacion')
class ControladorDePrueba {
  @Get()
  @PuedeOEsDelComite('editar', '6.3')
  registrar() {}
}

const PROCESO = '7d3f0a52-6a3e-4b8f-9a40-2f1c5e8b9d11';

function contexto(request: any) {
  return {
    getHandler: () => ControladorDePrueba.prototype.registrar,
    getClass: () => ControladorDePrueba,
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
}

function guardCon(alcances: Alcance[], dimensiones: string[]) {
  const comite = { dimensionesDe: jest.fn().mockResolvedValue(dimensiones) };
  const guard = new PuedeOEsDelComiteGuard(
    new Reflector(),
    { deRoles: jest.fn().mockResolvedValue(alcances) } as unknown as AlcanceService,
    { alguno: jest.fn().mockResolvedValue(false) } as unknown as PermisosService,
    comite as unknown as ComiteService,
  );
  return { guard, comite };
}

const evaluador: Alcance[] = [{ accion: 'editar', etapa: null, numeral: '6.3', tramite: null }];
const abogado = { user: { userId: 'u1', roles: ['ABOGADO_CONTRATACION'] }, params: { id: PROCESO } };

describe('PuedeOEsDelComiteGuard', () => {
  it('deja pasar al designado en el comité aunque su rol no tenga la 6.3', async () => {
    // Es el caso que confundía: el abogado ve su nombre en el comité y la
    // evaluación le respondía que no tiene permiso.
    const { guard } = guardCon([], ['JURIDICO']);

    await expect(guard.canActivate(contexto(abogado))).resolves.toBe(true);
  });

  it('a quien no es del comité lo sigue juzgando el alcance', async () => {
    const { guard } = guardCon(evaluador, []);

    await expect(guard.canActivate(contexto(abogado))).resolves.toBe(true);
  });

  it('sin comité ni alcance, no pasa', async () => {
    const { guard } = guardCon([], []);

    await expect(guard.canActivate(contexto(abogado))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('con un id que no es uuid no consulta el comité: eso lo rechaza el pipe', async () => {
    const { guard, comite } = guardCon(evaluador, ['JURIDICO']);

    await guard.canActivate(contexto({ ...abogado, params: { id: 'no-es-uuid' } }));

    expect(comite.dimensionesDe).not.toHaveBeenCalled();
  });
});
