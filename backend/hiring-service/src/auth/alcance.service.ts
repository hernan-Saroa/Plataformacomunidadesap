import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { Accion, Alcance, Destino, etapaDe, puede } from './alcance';

/**
 * Los alcances de cada rol, leídos de `hiring.alcances_permiso`.
 *
 * La consulta cruza las dos capas: devuelve una fila de alcance solo si el rol
 * tiene además activo el permiso de esa acción en `auth.role_permissions`. Así,
 * quitarle «Editar» a un rol desde el backoffice le apaga todos sus alcances de
 * edición sin tener que tocar la matriz del módulo.
 *
 * Caché por rol y TTL de un minuto, con el mismo razonamiento que
 * `PermisosService`: los roles son una docena y los usuarios miles, y un minuto
 * es lo que puede tardar en verse un cambio hecho en la pantalla.
 */
@Injectable()
export class AlcanceService {
  private readonly logger = new Logger(AlcanceService.name);

  private readonly cache = new Map<string, { alcances: Alcance[]; leidoEn: number }>();

  private static readonly TTL_MS = 60_000;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Los alcances de un conjunto de roles, juntos. */
  async deRoles(codigosRol: string[]): Promise<Alcance[]> {
    if (!codigosRol?.length) return [];

    const normalizados = [...new Set(codigosRol.map((c) => c.toUpperCase().trim()))];
    const ahora = Date.now();
    const porLeer = normalizados.filter((rol) => {
      const entrada = this.cache.get(rol);
      return !entrada || ahora - entrada.leidoEn >= AlcanceService.TTL_MS;
    });

    if (porLeer.length) {
      await this.leer(porLeer, ahora);
    }

    return normalizados.flatMap((rol) => this.cache.get(rol)?.alcances ?? []);
  }

  /**
   * Si quien pregunta puede hacer la acción en el destino.
   *
   * Es lo que usan los services para decidir fuera del guard —qué procesos
   * lista la bandeja, si se ofrece el botón de tomar—. Sustituye a
   * `tienePermiso`, que es síncrono y solo mira el token y el mapa del código:
   * un rol creado desde el backoffice no aparece en ninguno de los dos.
   *
   * Sin acceso responde que no, como `tienePermiso`.
   */
  async puedeEn(
    acceso: { roles?: string[] } | undefined,
    accion: Accion,
    destino?: Destino,
  ): Promise<boolean> {
    if (!acceso?.roles?.length) return false;
    return puede(await this.deRoles(acceso.roles), accion, destino);
  }

  /**
   * Las cuentas activas que pueden hacer la acción en un punto.
   *
   * Para avisar de lo que todavía no es de nadie —la bandeja de Contratación,
   * la solicitud de CDP—: se avisa a quien podría tomarlo, con el mismo
   * criterio que el guard. La cobertura se repite aquí en SQL porque recorrer
   * todas las cuentas en memoria para aplicar `cubre` no escala.
   */
  async cuentasQuePueden(accion: Accion, numeral: string): Promise<string[]> {
    const etapa = etapaDe(numeral);
    if (etapa === null) return [];

    const filas: { id: string }[] = await this.dataSource.query(
      `SELECT DISTINCT u.id_user::text AS id
         FROM auth."user" u
         JOIN auth.user_roles ur        ON ur.id_user = u.id_user AND ur.is_active = true
         JOIN auth.role r               ON r.id = ur.id_rol AND r.is_active = true
         JOIN hiring.alcances_permiso a ON a.rol_id = r.id AND a.activo
         JOIN auth.permission p         ON p.code = 'contratacion.' || a.accion
                                       AND p.is_active = true
         JOIN auth.role_permissions rp  ON rp.id_rol = r.id
                                       AND rp.id_permission = p.id_permission
                                       AND rp.is_active = true
        WHERE u.is_active = true
          AND a.accion = $1
          AND (   a.numeral = $2
               OR a.etapa = $3
               OR (a.etapa IS NULL AND a.numeral IS NULL AND a.tramite IS NULL))`,
      [accion, numeral, etapa],
    );
    return filas.map((f) => f.id);
  }

  /** Vacía la caché; la usan las pruebas y la pantalla al guardar la matriz. */
  limpiarCache(): void {
    this.cache.clear();
  }

  private async leer(roles: string[], ahora: number): Promise<void> {
    try {
      const filas: {
        rol: string;
        accion: Accion;
        etapa: number | null;
        numeral: string | null;
        tramite: string | null;
      }[] = await this.dataSource.query(
        `SELECT UPPER(r.code) AS rol, a.accion, a.etapa, a.numeral, a.tramite
           FROM hiring.alcances_permiso a
           JOIN auth.role r              ON r.id = a.rol_id
           JOIN auth.permission p        ON p.code = 'contratacion.' || a.accion
                                        AND p.is_active = true
           JOIN auth.role_permissions rp ON rp.id_rol = r.id
                                        AND rp.id_permission = p.id_permission
                                        AND rp.is_active = true
          WHERE a.activo
            AND UPPER(r.code) = ANY($1::text[])`,
        [roles],
      );

      const agrupados = new Map<string, Alcance[]>();
      for (const fila of filas) {
        const lista = agrupados.get(fila.rol) ?? [];
        lista.push({
          accion: fila.accion,
          // smallint llega como number, pero se fuerza por si el driver lo
          // devuelve como texto: `cubre` compara con ===.
          etapa: fila.etapa === null ? null : Number(fila.etapa),
          numeral: fila.numeral,
          tramite: fila.tramite,
        });
        agrupados.set(fila.rol, lista);
      }

      // También los roles sin alcance, para no volver a consultarlos en cada
      // petición de un usuario de otro módulo.
      for (const rol of roles) {
        this.cache.set(rol, { alcances: agrupados.get(rol) ?? [], leidoEn: ahora });
      }
    } catch (error: any) {
      // Sin alcances y sin cachear el fallo, como en PermisosService: un error
      // de base no puede conceder accesos ni dejarlos negados durante el TTL.
      this.logger.error(`No se pudieron leer los alcances: ${error.message}`);
    }
  }
}
