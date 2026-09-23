import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { Accion, Destino, esDestinoValido, puede } from './alcance';
import { AlcanceService } from './alcance.service';
import { normalizeRoles } from './hiring-access';
import { permisosDelUsuario } from './permisos';
import { PermisosService } from './permisos.service';

export const PUEDE_KEY = 'puede';

/** El destino lo trae la ruta: `procesos/:id/actividades/:numeral`. */
export interface DestinoDeRuta {
  param: string;
}

export interface OpcionesPuede {
  /**
   * Un permiso transversal que también abre el endpoint.
   *
   * Para las lecturas de datos de referencia que usa la pantalla de
   * configuración —el catálogo de actividades, los umbrales—: el administrador
   * del módulo no trabaja procesos y no tiene alcance, pero tiene que poder
   * leer lo que configura.
   */
  oPermiso?: string;
}

interface Exigencia {
  /** Una acción, o varias si cualquiera de ellas basta. */
  accion: Accion | Accion[];
  destino?: Destino | DestinoDeRuta;
  opciones?: OpcionesPuede;
}

/**
 * Restringe un endpoint a quien pueda hacer esa acción en ese lugar.
 *
 *   @Puede('editar', '4.2')                    un punto fijo
 *   @Puede('editar', { param: 'numeral' })     el punto viene en la ruta
 *   @Puede('decidir', 'INC.2')                 un trámite sin numeral
 *   @Puede('ver', 'TODO')                      todo el módulo (auditoría)
 *   @Puede('ver')                              en alguna parte (referencias)
 *   @Puede(['editar', 'decidir'], '8.1')       cualquiera de las dos basta
 *
 * Varias acciones son para el endpoint que dos actores usan con papeles
 * distintos —firmar el contrato como gestor o como ordenador—: el guard deja
 * pasar a los dos y el service decide qué puede hacer cada uno.
 * Aplica su propio guard: no hace falta `@UseGuards` al lado.
 */
export const Puede = (
  accion: Accion | Accion[],
  destino?: Destino | DestinoDeRuta,
  opciones?: OpcionesPuede,
) =>
  applyDecorators(
    SetMetadata(PUEDE_KEY, { accion, destino, opciones } satisfies Exigencia),
    UseGuards(PuedeGuard),
  );

/**
 * Deja pasar a quien tenga la acción con un alcance que cubra el destino.
 *
 * Qué procesos alcanza el usuario no se decide aquí: eso sigue siendo de la
 * participación y de `proceso.view-all`, en los services. Tampoco las reglas
 * de negocio —no aprobar lo que uno mismo envió, pertenecer al comité—, que
 * siguen donde estaban. Este guard responde solo «¿esta clase de usuario puede
 * hacer esto en este punto?».
 */
@Injectable()
export class PuedeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly alcanceService: AlcanceService,
    private readonly permisosService: PermisosService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const exigencia = this.reflector.getAllAndOverride<Exigencia | undefined>(PUEDE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!exigencia) return true;

    const request = context.switchToHttp().getRequest();
    const { user } = request;
    if (!user) throw new ForbiddenException('Usuario no autenticado');

    const destino = this.resolverDestino(exigencia.destino, request);
    const roles = normalizeRoles(user.roles ?? user.role);

    const alcances = await this.alcanceService.deRoles(roles);
    const acciones = Array.isArray(exigencia.accion) ? exigencia.accion : [exigencia.accion];
    if (acciones.some((accion) => puede(alcances, accion, destino))) return true;

    const alternativo = exigencia.opciones?.oPermiso;
    if (alternativo) {
      if (permisosDelUsuario(user).includes(alternativo)) return true;
      if (await this.permisosService.alguno(roles, [alternativo])) return true;
    }

    const que = acciones.join(' o ');
    throw new ForbiddenException(
      destino
        ? `No tienes permiso para ${que} en ${destino}`
        : `No tienes permiso para ${que} en este módulo`,
    );
  }

  private resolverDestino(
    destino: Destino | DestinoDeRuta | undefined,
    request: any,
  ): Destino | undefined {
    if (destino === undefined) return undefined;
    if (typeof destino === 'string') return destino;

    const valor = request.params?.[destino.param];
    // Un numeral que no se entiende se niega aquí y no se deja llegar a
    // `cubre`: así el mensaje dice qué estaba mal en vez de un 403 genérico.
    if (typeof valor !== 'string' || !esDestinoValido(valor)) {
      throw new ForbiddenException(`El punto «${valor ?? ''}» no es un destino válido`);
    }
    return valor;
  }
}
