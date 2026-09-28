import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import { ACCIONES, Accion, Alcance, alcanceDeLugar, lugarDe } from '../../auth/alcance';
import { AlcanceService } from '../../auth/alcance.service';
import { HiringAccess, normalizeRoles } from '../../auth/hiring-access';
import { PERMISOS_TRANSVERSALES, permisosDelUsuario } from '../../auth/permisos';
import { PermisosService } from '../../auth/permisos.service';
import { AlcanceDto } from './dto/alcance.dto';

/** Un alcance tal como lo ven la API y la pantalla. */
export interface AlcanceVista {
  accion: Accion;
  lugar: string;
  confirmado: boolean;
}

/** Un rol en la matriz de permisos por etapa. */
export interface RolConAlcance {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  /** Las acciones cuyo permiso le dio el backoffice. */
  acciones: Accion[];
  /** Los permisos transversales que tiene. */
  transversales: string[];
  alcances: AlcanceVista[];
}

/**
 * La matriz de permisos por etapa: qué ve y qué administra cada quien
 * (migración 083, subtareas 5 y 6).
 *
 * La pantalla escribe aquí el «dónde»; el «qué» —el permiso de cada acción— lo
 * sigue dando el backoffice de roles de la plataforma, que no es de este
 * módulo. Por eso la matriz enseña las dos cosas juntas y avisa cuando no
 * coinciden, pero solo escribe la suya.
 */
@Injectable()
export class AlcanceAdminService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly alcance: AlcanceService,
    private readonly permisos: PermisosService,
  ) {}

  /**
   * Lo que puede hacer quien pregunta, para que la pantalla no ofrezca lo que
   * la API va a negar.
   *
   * Son los mismos alcances que evalúa el guard —ya filtrados por permiso—, y
   * los permisos transversales, que no son de ninguna etapa.
   */
  async mio(user: any) {
    const roles = normalizeRoles(user?.roles ?? user?.role);
    const [alcances, deLaBase] = await Promise.all([
      this.alcance.deRoles(roles),
      this.permisos.permisosDeRoles(roles),
    ]);

    const suyos = new Set([...permisosDelUsuario(user), ...deLaBase]);
    return {
      alcances: alcances.map((a) => ({ accion: a.accion, lugar: lugarDe(a) })),
      transversales: PERMISOS_TRANSVERSALES.filter((p) => suyos.has(p)),
    };
  }

  /**
   * Los roles que tienen algo que ver con el módulo: algún permiso de
   * contratación o algún alcance.
   *
   * Un rol que el administrador cree en el backoffice y al que le dé «Ver»
   * aparece aquí solo, sin tocar nada, que es lo que hace falta para darle
   * después su alcance. Los cuarenta y tantos roles de otros módulos no.
   */
  async roles(): Promise<RolConAlcance[]> {
    const filas: {
      id: string;
      codigo: string;
      nombre: string;
      descripcion: string | null;
      permisos: string[] | null;
    }[] = await this.dataSource.query(
      `SELECT r.id::text AS id, r.code AS codigo, r.name AS nombre, r.description AS descripcion,
              array_remove(array_agg(DISTINCT p.code), NULL) AS permisos
         FROM auth.role r
         LEFT JOIN auth.role_permissions rp ON rp.id_rol = r.id AND rp.is_active = true
         LEFT JOIN auth.permission p        ON p.id_permission = rp.id_permission
                                           AND p.is_active = true
                                           AND p.code LIKE 'contratacion.%'
        WHERE r.is_active = true
        GROUP BY r.id, r.code, r.name, r.description
       HAVING count(p.code) > 0
           OR EXISTS (SELECT 1 FROM hiring.alcances_permiso a WHERE a.rol_id = r.id AND a.activo)
        ORDER BY r.name`,
    );

    const alcances = await this.alcancesDe(filas.map((f) => f.id));

    return filas.map((f) => {
      const permisos = f.permisos ?? [];
      return {
        id: f.id,
        codigo: f.codigo,
        nombre: f.nombre,
        descripcion: f.descripcion,
        acciones: ACCIONES.filter((a) => permisos.includes(`contratacion.${a}`)),
        transversales: PERMISOS_TRANSVERSALES.filter((p) => permisos.includes(p)),
        alcances: alcances.get(f.id) ?? [],
      };
    });
  }

  /**
   * Reemplaza los alcances de un rol por los que se mandan.
   *
   * Lo que sobra se apaga (`activo = false`) y no se borra, con el criterio de
   * la 068: la fila conserva quién la dio y cuándo, que es lo que pregunta una
   * auditoría de accesos. Lo nuevo entra confirmado, porque lo decidió una
   * persona en la pantalla y no la siembra.
   */
  async guardar(rolId: string, pedidos: AlcanceDto[], acceso: HiringAccess) {
    let nuevos: Alcance[];
    try {
      nuevos = pedidos.map((p) => alcanceDeLugar(p.accion, p.lugar));
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }

    await this.dataSource.transaction(async (em) => {
      const [rol] = await em.query(`SELECT id FROM auth.role WHERE id::text = $1 AND is_active = true`, [
        rolId,
      ]);
      if (!rol) throw new NotFoundException('Ese rol no existe o está inactivo');

      // Los numerales tienen que existir y estar activos: la FK exigiría lo
      // primero con un error de base, y lo segundo no lo exige nadie. Una
      // actividad retirada de la matriz no se ve en la pantalla, así que darle
      // alcance sería dar algo que nadie puede ver ni quitar.
      const numerales = [...new Set(nuevos.map((a) => a.numeral).filter((n): n is string => !!n))];
      if (numerales.length) {
        const existentes: { numeral: string }[] = await em.query(
          `SELECT numeral FROM hiring.actividades WHERE numeral = ANY($1::text[]) AND activa`,
          [numerales],
        );
        const faltan = numerales.filter((n) => !existentes.some((e) => e.numeral === n));
        if (faltan.length) {
          throw new BadRequestException(
            `No existe la actividad ${faltan.join(', ')}, o está retirada de la matriz`,
          );
        }
      }

      const clave = (a: Alcance) => `${a.accion}|${lugarDe(a)}`;
      const actuales: (Alcance & { id: string })[] = await em.query(
        `SELECT id, accion, etapa, numeral, tramite
           FROM hiring.alcances_permiso
          WHERE rol_id::text = $1 AND activo`,
        [rolId],
      );
      const queda = new Set(nuevos.map(clave));
      const habia = new Set(actuales.map((a) => clave({ ...a, etapa: a.etapa === null ? null : Number(a.etapa) })));

      const apagar = actuales.filter(
        (a) => !queda.has(clave({ ...a, etapa: a.etapa === null ? null : Number(a.etapa) })),
      );
      if (apagar.length) {
        await em.query(
          `UPDATE hiring.alcances_permiso SET activo = false, updated_at = now() WHERE id = ANY($1::uuid[])`,
          [apagar.map((a) => a.id)],
        );
      }

      // Lo que se queda, queda ratificado: una persona lo vio y lo dejó.
      const quedan = actuales.filter((a) => !apagar.includes(a));
      if (quedan.length) {
        await em.query(
          `UPDATE hiring.alcances_permiso SET confirmado = true, updated_at = now()
            WHERE id = ANY($1::uuid[]) AND NOT confirmado`,
          [quedan.map((a) => a.id)],
        );
      }

      for (const a of nuevos.filter((n) => !habia.has(clave(n)))) {
        await em.query(
          `INSERT INTO hiring.alcances_permiso (rol_id, accion, etapa, numeral, tramite, confirmado, created_by)
           VALUES ($1::uuid, $2, $3, $4, $5, true, $6)`,
          [rolId, a.accion, a.etapa, a.numeral, a.tramite, acceso.userName],
        );
      }
    });

    // Sin esto el cambio tardaría hasta un minuto en verse en este servidor.
    this.alcance.limpiarCache();

    const actualizado = (await this.roles()).find((r) => r.id === rolId);
    if (!actualizado) throw new NotFoundException('Ese rol no existe o está inactivo');
    return actualizado;
  }

  private async alcancesDe(rolIds: string[]): Promise<Map<string, AlcanceVista[]>> {
    const porRol = new Map<string, AlcanceVista[]>();
    if (!rolIds.length) return porRol;

    const filas: {
      rol_id: string;
      accion: Accion;
      etapa: number | null;
      numeral: string | null;
      tramite: string | null;
      confirmado: boolean;
    }[] = await this.dataSource.query(
      `SELECT rol_id::text AS rol_id, accion, etapa, numeral, tramite, confirmado
         FROM hiring.alcances_permiso
        WHERE activo AND rol_id::text = ANY($1::text[])
        ORDER BY accion, etapa NULLS FIRST, numeral, tramite`,
      [rolIds],
    );
    for (const f of filas) {
      const lista = porRol.get(f.rol_id) ?? [];
      lista.push({
        accion: f.accion,
        lugar: lugarDe({ etapa: f.etapa === null ? null : Number(f.etapa), numeral: f.numeral, tramite: f.tramite }),
        confirmado: f.confirmado,
      });
      porRol.set(f.rol_id, lista);
    }
    return porRol;
  }
}
