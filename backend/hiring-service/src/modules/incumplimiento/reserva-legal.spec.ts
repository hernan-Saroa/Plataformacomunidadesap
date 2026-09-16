import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { PermisosGuard } from '../../auth/permisos.guard';
import { PERMISOS_KEY } from '../../auth/permisos.decorator';
import {
  PERMISO_INCUMPLIMIENTO_DECIDIR,
  PERMISO_INCUMPLIMIENTO_TRAMITAR,
  PERMISO_INCUMPLIMIENTO_VER,
  tienePermiso,
} from '../../auth/permisos';

/**
 * Criterio de EFDS-1182 (RF-INC-03): «dado un caso de presunto incumplimiento,
 * cuando alguien sin la atribución intenta consultarlo, entonces el sistema le
 * niega el acceso; y cuando lo consulta quien sí la tiene, entonces el sistema
 * deja constancia de quién lo hizo».
 *
 * Son las dos mitades de la reserva legal y se prueban por separado porque las
 * resuelven dos piezas distintas: el bloqueo lo hace PermisosGuard antes de
 * llegar al servicio, y la constancia la deja el servicio al responder. Probar
 * solo el bloqueo dejaría sin verificar que el acceso legítimo queda anotado,
 * que es lo que un ente de control viene a pedir.
 *
 * Se prueba el guard directamente, sin levantar el módulo: lo que la historia
 * exige es que un permiso ausente corte la petición, y eso ocurre en
 * `canActivate` sin que haga falta base de datos ni HTTP.
 */

/**
 * El contexto mínimo que PermisosGuard lee: el handler y la clase para buscar
 * la metadata, y el `user` de la petición.
 */
function contextoCon(user: unknown): ExecutionContext {
  return {
    getHandler: () => function consultar() {},
    getClass: () => class IncumplimientoController {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

/**
 * Un guard con la metadata ya puesta, para no depender de los decoradores del
 * controlador: aquí se prueba la regla, no cómo se anota.
 *
 * `PermisosService` se sustituye por uno que nunca otorga nada. Es
 * deliberado: la tercera fuente del guard —el mapa del código— ya está
 * cubierta por `tienePermiso`, y dejar que la consulta respondiera «sí» aquí
 * escondería el fallo que esta prueba busca.
 */
function guardExigiendo(...permisos: string[]): PermisosGuard {
  const reflector = { getAllAndOverride: () => permisos } as unknown as Reflector;
  const servicio = { alguno: async () => false } as any;
  return new PermisosGuard(reflector, servicio);
}

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
    it('un usuario sin permisos no pasa del guard', async () => {
      const guard = guardExigiendo(PERMISO_INCUMPLIMIENTO_VER);

      await expect(
        guard.canActivate(contextoCon({ permissions: [], roles: [] })),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('tener otro permiso del módulo no abre el caso', async () => {
      // Instruir el trámite no es consultarlo: la reserva se pide permiso a
      // permiso, no por pertenecer al bloque.
      const guard = guardExigiendo(PERMISO_INCUMPLIMIENTO_VER);

      await expect(
        guard.canActivate(
          contextoCon({ permissions: [PERMISO_INCUMPLIMIENTO_TRAMITAR], roles: [] }),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('sin sesión tampoco', async () => {
      const guard = guardExigiendo(PERMISO_INCUMPLIMIENTO_VER);

      await expect(guard.canActivate(contextoCon(undefined))).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('el mensaje dice qué permiso falta y no qué rol', async () => {
      // Nombrar el rol sería adivinar: cuál lo otorga depende de cómo esté
      // configurada la entidad, y cambia sin tocar el código.
      const guard = guardExigiendo(PERMISO_INCUMPLIMIENTO_VER);

      await expect(
        guard.canActivate(contextoCon({ permissions: [], roles: [] })),
      ).rejects.toThrow(PERMISO_INCUMPLIMIENTO_VER);
    });

    it('con la atribución sí pasa', async () => {
      const guard = guardExigiendo(PERMISO_INCUMPLIMIENTO_VER);

      await expect(
        guard.canActivate(contextoCon({ permissions: [PERMISO_INCUMPLIMIENTO_VER], roles: [] })),
      ).resolves.toBe(true);
    });
  });

  /**
   * Quién queda dentro de la reserva.
   *
   * La lista es más ancha que la de reportar porque el caso lo tramita el área
   * jurídica y lo revisa la Dirección, pero sigue siendo una lista: que sea
   * ancha no la convierte en abierta.
   */
  describe('a quién alcanza la reserva', () => {
    it('un rol ajeno al módulo no consulta el caso', () => {
      expect(tienePermiso({ roles: ['CONTRATISTA'] }, PERMISO_INCUMPLIMIENTO_VER)).toBe(false);
    });

    it('instruir y decidir siguen separados dentro de la reserva', () => {
      // La migración 651 lo explica: quien lleva el trámite no lo sanciona.
      const permisos = { roles: ['GESTOR_CONTRATACION'] };

      expect(tienePermiso(permisos, PERMISO_INCUMPLIMIENTO_DECIDIR)).toBe(false);
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
