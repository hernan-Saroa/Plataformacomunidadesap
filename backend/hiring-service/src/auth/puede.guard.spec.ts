import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Alcance } from './alcance';
import { AlcanceService } from './alcance.service';
import { PermisosService } from './permisos.service';
import { Puede, PuedeGuard } from './puede.guard';

/** Un controlador de mentira con una ruta por forma de destino. */
@Controller('prueba')
class ControladorDePrueba {
  @Get('fijo')
  @Puede('editar', '4.2')
  fijo() {}

  @Get('ruta')
  @Puede('editar', { param: 'numeral' })
  ruta() {}

  @Get('referencia')
  @Puede('ver', undefined, { oPermiso: 'contratacion.config.manage' })
  referencia() {}

  @Get('varias')
  @Puede(['editar', 'decidir'], '8.1')
  varias() {}

  @Get('libre')
  libre() {}
}

function contexto(handler: keyof ControladorDePrueba, request: any) {
  return {
    getHandler: () => ControladorDePrueba.prototype[handler],
    getClass: () => ControladorDePrueba,
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
}

function guardCon(alcances: Alcance[], permisosDeRoles: string[] = []) {
  const alcanceService = { deRoles: jest.fn().mockResolvedValue(alcances) };
  const permisosService = {
    alguno: jest.fn(async (_roles: string[], pedidos: string[]) =>
      pedidos.some((p) => permisosDeRoles.includes(p)),
    ),
  };
  const guard = new PuedeGuard(
    new Reflector(),
    alcanceService as unknown as AlcanceService,
    permisosService as unknown as PermisosService,
  );
  return { guard, alcanceService };
}

const financiera: Alcance[] = [
  { accion: 'editar', etapa: null, numeral: '4.2', tramite: null },
];
const usuario = { user: { userId: 'u1', roles: ['ESTRUCTURADOR_FINANCIERO'] }, params: {} };

describe('PuedeGuard', () => {
  it('deja pasar a quien tiene la acción en ese punto', async () => {
    const { guard, alcanceService } = guardCon(financiera);

    await expect(guard.canActivate(contexto('fijo', usuario))).resolves.toBe(true);
    expect(alcanceService.deRoles).toHaveBeenCalledWith(['ESTRUCTURADOR_FINANCIERO']);
  });

  it('niega y dice qué acción y dónde, no qué rol', async () => {
    const { guard } = guardCon([{ accion: 'editar', etapa: null, numeral: '4.3', tramite: null }]);

    await expect(guard.canActivate(contexto('fijo', usuario))).rejects.toThrow(
      'No tienes permiso para editar en 4.2',
    );
  });

  it('lee el punto de la ruta cuando el endpoint lo declara así', async () => {
    const { guard } = guardCon(financiera);

    await expect(
      guard.canActivate(contexto('ruta', { ...usuario, params: { numeral: '4.2' } })),
    ).resolves.toBe(true);
    await expect(
      guard.canActivate(contexto('ruta', { ...usuario, params: { numeral: '4.3' } })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rechaza un punto de la ruta que no es un destino', async () => {
    const { guard, alcanceService } = guardCon([
      { accion: 'editar', etapa: null, numeral: null, tramite: null },
    ]);

    await expect(
      guard.canActivate(contexto('ruta', { ...usuario, params: { numeral: '4.2x' } })),
    ).rejects.toThrow('no es un destino válido');
    // Ni siquiera llega a consultar: todo el módulo no debe tapar un
    // numeral mal formado.
    expect(alcanceService.deRoles).not.toHaveBeenCalled();
  });

  it('admite el permiso transversal cuando no hay alcance', async () => {
    // El administrador del módulo configura sin trabajar procesos.
    const { guard } = guardCon([], ['contratacion.config.manage']);

    await expect(
      guard.canActivate(
        contexto('referencia', { user: { roles: ['ADMINISTRADOR_CONTRATACION'] }, params: {} }),
      ),
    ).resolves.toBe(true);
  });

  it('sin alcance ni permiso transversal, niega', async () => {
    const { guard } = guardCon([]);

    await expect(
      guard.canActivate(contexto('referencia', { user: { roles: ['OTRO'] }, params: {} })),
    ).rejects.toThrow(ForbiddenException);
  });

  it('no se mete con los endpoints que no lo declaran', async () => {
    const { guard, alcanceService } = guardCon([]);

    await expect(guard.canActivate(contexto('libre', usuario))).resolves.toBe(true);
    expect(alcanceService.deRoles).not.toHaveBeenCalled();
  });

  it('con varias acciones basta cualquiera de ellas', async () => {
    // El gestor firma el contrato por el contratista (editar 8.1) y el
    // Ordenador por la entidad (decidir 8.1): el mismo endpoint.
    const ordenador = guardCon([{ accion: 'decidir', etapa: null, numeral: '8.1', tramite: null }]);
    await expect(ordenador.guard.canActivate(contexto('varias', usuario))).resolves.toBe(true);

    const gestor = guardCon([{ accion: 'editar', etapa: 8, numeral: null, tramite: null }]);
    await expect(gestor.guard.canActivate(contexto('varias', usuario))).resolves.toBe(true);

    const otro = guardCon([{ accion: 'aprobar', etapa: null, numeral: '8.1', tramite: null }]);
    await expect(otro.guard.canActivate(contexto('varias', usuario))).rejects.toThrow(
      'No tienes permiso para editar o decidir en 8.1',
    );
  });

  it('sin usuario, niega', async () => {
    const { guard } = guardCon(financiera);

    await expect(guard.canActivate(contexto('fijo', { params: {} }))).rejects.toThrow(
      'Usuario no autenticado',
    );
  });
});
