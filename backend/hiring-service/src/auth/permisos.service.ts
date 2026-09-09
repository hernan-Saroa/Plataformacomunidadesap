import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Los permisos que otorga cada rol, leídos de `auth.role_permissions`.
 *
 * El JWT trae los roles del usuario, no sus permisos, así que alguien tiene que
 * traducir unos en otros. Hacerlo contra la base —y no contra un mapa escrito
 * en el código— es lo que permite que un administrador cree un rol nuevo desde
 * el backoffice, le asigne facultades y funcione sin desplegar nada.
 *
 * Es el mismo patrón que ya usan control interno y control disciplinario, los
 * dos módulos con más permisos de la plataforma.
 *
 * ------------------------------------------------------------------ caché --
 *
 * La consulta entraría en la ruta de cada petición autorizada, así que el
 * resultado se guarda por rol y no por usuario: los roles son una docena y los
 * usuarios miles, así que la caché por rol se llena entera con las primeras
 * peticiones y a partir de ahí ningún login nuevo añade entradas. Dos usuarios
 * con el mismo rol comparten la misma fila.
 *
 * El TTL es corto a propósito. Los permisos de un rol cambian cuando alguien
 * los edita en el backoffice, y un minuto es lo que puede tardar en verse ese
 * cambio; más allá, quien acaba de quitar una facultad no entendería por qué
 * sigue concedida.
 */
@Injectable()
export class PermisosService {
  private readonly logger = new Logger(PermisosService.name);

  /** Permisos por código de rol, con el momento en que se leyeron. */
  private readonly cache = new Map<string, { permisos: string[]; leidoEn: number }>();

  private static readonly TTL_MS = 60_000;

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /**
   * Los permisos de un conjunto de roles, sin repetir.
   *
   * Solo consulta los roles que no estén en caché o cuya entrada haya vencido,
   * así que un usuario con tres roles ya vistos no toca la base.
   */
  async permisosDeRoles(codigosRol: string[]): Promise<string[]> {
    if (!codigosRol?.length) return [];

    const normalizados = [...new Set(codigosRol.map((c) => c.toUpperCase().trim()))];
    const ahora = Date.now();
    const porLeer = normalizados.filter((rol) => {
      const entrada = this.cache.get(rol);
      return !entrada || ahora - entrada.leidoEn >= PermisosService.TTL_MS;
    });

    if (porLeer.length) {
      await this.leer(porLeer, ahora);
    }

    const union = new Set<string>();
    for (const rol of normalizados) {
      for (const permiso of this.cache.get(rol)?.permisos ?? []) {
        union.add(permiso);
      }
    }
    return [...union];
  }

  /** Si esos roles alcanzan para al menos uno de los permisos pedidos. */
  async alguno(codigosRol: string[], permisos: string[]): Promise<boolean> {
    if (!permisos?.length) return true;
    const suyos = await this.permisosDeRoles(codigosRol);
    return permisos.some((p) => suyos.includes(p));
  }

  /** Vacía la caché; la usan las pruebas y un eventual endpoint de refresco. */
  limpiarCache(): void {
    this.cache.clear();
  }

  private async leer(roles: string[], ahora: number): Promise<void> {
    try {
      const filas: { rol: string; code: string }[] = await this.dataSource.query(
        `SELECT UPPER(r.code) AS rol, p.code
           FROM auth.permission p
           JOIN auth.role_permissions rp ON rp.id_permission = p.id_permission
           JOIN auth.role r ON r.id = rp.id_rol
          WHERE UPPER(r.code) = ANY($1::text[])
            AND rp.is_active = true
            AND p.is_active = true`,
        [roles],
      );

      const agrupados = new Map<string, string[]>();
      for (const fila of filas) {
        const lista = agrupados.get(fila.rol) ?? [];
        lista.push(fila.code);
        agrupados.set(fila.rol, lista);
      }

      // Se cachean también los roles sin permisos: sin esto, un rol ajeno al
      // módulo volvería a consultarse en cada petición que hiciera su titular.
      for (const rol of roles) {
        this.cache.set(rol, { permisos: agrupados.get(rol) ?? [], leidoEn: ahora });
      }
    } catch (error: any) {
      // Sin permisos y sin cachear el fallo: un error de base no debe conceder
      // accesos ni quedarse fijado durante el TTL. El guard negará el paso y la
      // siguiente petición volverá a intentarlo.
      this.logger.error(`No se pudieron leer los permisos: ${error.message}`);
    }
  }
}
