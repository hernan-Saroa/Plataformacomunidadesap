import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Alcance } from '../../auth/alcance';
import { PuedeGuard } from '../../auth/puede.guard';

/**
 * Criterio de EFDS-1182 (RF-INC-03): «dado un caso de presunto incumplimiento,
 * cuando alguien sin la atribución intenta consultarlo, entonces el sistema le
 * niega el acceso; y cuando lo consulta quien sí la tiene, entonces el sistema
 * deja constancia de quién lo hizo».
 *
 * Son las dos mitades de la reserva legal y se prueban por separado porque las
 * resuelven dos piezas distintas: el bloqueo lo hace el guard antes de llegar
 * al servicio, y la constancia la deja el servicio al responder.
 *
 * Desde la 083 la atribución es `ver` en el trámite INC.1 —o en todo el
 * módulo—: el caso no cuelga de la etapa 9, así que ver la ejecución del
 * contrato no abre el incumplimiento.
 */

/** El contexto mínimo que PuedeGuard lee: el handler, la clase y el usuario. */
function contextoCon(user: unknown): ExecutionContext {
  return {
    getHandler: () => function estado() {},
    getClass: () => class IncumplimientoController {},
    switchToHttp: () => ({ getRequest: () => ({ user, params: {} }) }),
  } as unknown as ExecutionContext;
}

const alcance = (accion: Alcance['accion'], lugar: { etapa?: number; tramite?: string } = {}): Alcance => ({
  accion,
  etapa: lugar.etapa ?? null,
  numeral: null,
  tramite: lugar.tramite ?? null,
});

/**
 * Un guard que exige ver el INC.1, como el GET del incumplimiento, con los
 * alcances que se le den al usuario.
 */
function guardCon(alcances: Alcance[]): PuedeGuard {
  const reflector = {
    getAllAndOverride: () => ({ accion: 'ver', destino: 'INC.1' }),
  } as unknown as Reflector;
  return new PuedeGuard(
    reflector,
    { deRoles: async () => alcances } as any,
    { alguno: async () => false } as any,
  );
}

const USUARIO = { roles: ['CUALQUIERA'] };

/**
 * Un EntityManager de mentira que recuerda lo que se guardó.
 *
 * El proceso existe y no tiene contrato, que es el camino más corto hasta la
 * respuesta: la constancia se escribe antes de mirar si hay casos, así que
 * este escenario basta para comprobar que queda anotada. `guardadas` recoge
 * las filas de trazabilidad, que es lo único que estas pruebas leen.
 */
function managerDePrueba() {
  const guardadas: any[] = [];

  const em = {
    create: (_entidad: unknown, datos: any) => datos,
    save: async (fila: any) => {
      guardadas.push(fila);
      return fila;
    },
    query: async () => [],
    getRepository: () => ({
      // El proceso existe: si no, el servicio corta con NotFound y nunca se
      // llegaría a la constancia que se quiere verificar.
      findOne: async () => ({ id: 'proceso-1' }),
      find: async () => [],
      findByIds: async () => [],
      // Sin contrato asociado; el servicio responde temprano y sin casos.
      createQueryBuilder: () => ({
        where: () => ({
          andWhere: () => ({
            orderBy: () => ({ getOne: async () => null }),
          }),
        }),
      }),
    }),
  };

  return { guardadas, em };
}

describe('reserva legal del caso de incumplimiento', () => {
  describe('sin la atribución, el acceso se bloquea', () => {
    it('un usuario sin alcance no pasa del guard', async () => {
      await expect(guardCon([]).canActivate(contextoCon(USUARIO))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('ver toda la ejecución del contrato no abre el caso', async () => {
      // El incumplimiento no cuelga de la etapa 9: quien vigila el contrato no
      // entra por eso al trámite que lo juzga.
      await expect(
        guardCon([alcance('ver', { etapa: 9 })]).canActivate(contextoCon(USUARIO)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('el trámite sancionatorio tampoco: INC.2 no es INC.1', async () => {
      await expect(
        guardCon([alcance('ver', { tramite: 'INC.2' })]).canActivate(contextoCon(USUARIO)),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('sin sesión tampoco', async () => {
      await expect(guardCon([]).canActivate(contextoCon(undefined))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('el mensaje dice qué acción falta y dónde, no qué rol', async () => {
      await expect(guardCon([]).canActivate(contextoCon(USUARIO))).rejects.toThrow(
        'No tienes permiso para ver en INC.1',
      );
    });

    it('con la atribución sí pasa: su trámite o todo el módulo', async () => {
      await expect(
        guardCon([alcance('ver', { tramite: 'INC.1' })]).canActivate(contextoCon(USUARIO)),
      ).resolves.toBe(true);
      await expect(guardCon([alcance('ver')]).canActivate(contextoCon(USUARIO))).resolves.toBe(
        true,
      );
    });

    it('reportar el caso también deja verlo', async () => {
      // Editar implica ver: el supervisor que lo reporta sigue su caso.
      await expect(
        guardCon([alcance('editar', { tramite: 'INC.1' })]).canActivate(contextoCon(USUARIO)),
      ).resolves.toBe(true);
    });
  });

  /**
   * La otra mitad: el acceso legítimo deja rastro.
   *
   * En materia sujeta a reserva importa saber quién miró, no solo quién
   * escribió, así que la constancia se comprueba sobre la consulta y no sobre
   * el reporte.
   */
  describe('con la atribución, el acceso queda registrado', () => {
    it('consultar el bloque anota CONSULTAR con el usuario', async () => {
      const { guardadas, em } = managerDePrueba();

      const { IncumplimientoService } = await import('./incumplimiento.service');
      const servicio = new IncumplimientoService({ manager: em } as any, {} as any);

      await servicio.estado('proceso-1', {
        userId: 'u-1',
        userName: 'Ana Auditora',
        roles: ['REVISOR_CONTRATACION'],
      } as any);

      const consulta = guardadas.find((t) => t.accion === 'CONSULTAR');

      expect(consulta).toBeDefined();
      expect(consulta.entidad).toBe('caso_incumplimiento');
      expect(consulta.usuarioNombre).toBe('Ana Auditora');
      expect(consulta.usuarioId).toBe('u-1');
    });

    it('se anota aunque el proceso no tenga casos', async () => {
      // El acceso al módulo ya es el hecho auditable: si solo se anotara
      // habiendo casos, quien mira un expediente limpio no dejaría rastro y la
      // bitácora no serviría para saber quién estuvo buscando.
      const { guardadas, em } = managerDePrueba();

      const { IncumplimientoService } = await import('./incumplimiento.service');
      const servicio = new IncumplimientoService({ manager: em } as any, {} as any);

      const estado = await servicio.estado('proceso-sin-casos', {
        userId: 'u-2',
        userName: 'Beto Revisor',
        roles: ['REVISOR_CONTRATACION'],
      } as any);

      expect(estado.casos).toEqual([]);
      expect(guardadas.filter((t) => t.accion === 'CONSULTAR')).toHaveLength(1);
    });
  });
});
