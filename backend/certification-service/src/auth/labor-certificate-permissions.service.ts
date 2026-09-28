import { ForbiddenException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class LaborCertificatePermissionsService {
  constructor(private readonly dataSource: DataSource) {}

  async assertRequestPermission(
    req: any,
    permissionCode: string,
    deniedMessage: string,
  ): Promise<void> {
    const roleCodes = this.extractSignedRoleCodes(req?.user?.roles);

    if (roleCodes.length === 0) {
      throw new ForbiddenException(deniedMessage);
    }

    const rows = await this.dataSource.query(
      `SELECT EXISTS (
         SELECT 1
         FROM auth.role role
         INNER JOIN auth.role_permissions role_permission
           ON role_permission.id_rol = role.id
          AND COALESCE(role_permission.is_active, TRUE) = TRUE
         INNER JOIN auth.permission permission
           ON permission.id_permission = role_permission.id_permission
          AND permission.is_active = TRUE
         WHERE role.is_active = TRUE
           AND role.code = ANY($1::text[])
           AND permission.code = $2
       ) AS allowed`,
      [roleCodes, permissionCode],
    );

    if (!this.toBoolean(rows?.[0]?.allowed)) {
      throw new ForbiddenException(deniedMessage);
    }
  }

  /**
   * Igual que `assertRequestPermission`, pero basta con UNO de los permisos.
   *
   * Se usa cuando un permiso amplio incluye a otro mas acotado: quien puede
   * gestionar la matriz de funciones tambien puede consultarla, sin que haya que
   * marcarle los dos permisos en el rol.
   */
  async assertRequestAnyPermission(
    req: any,
    permissionCodes: string[],
    deniedMessage: string,
  ): Promise<void> {
    const roleCodes = this.extractSignedRoleCodes(req?.user?.roles);
    const codes = Array.from(
      new Set(
        (Array.isArray(permissionCodes) ? permissionCodes : [permissionCodes])
          .map((code) => String(code || '').trim())
          .filter(Boolean),
      ),
    );

    if (roleCodes.length === 0 || codes.length === 0) {
      throw new ForbiddenException(deniedMessage);
    }

    const rows = await this.dataSource.query(
      `SELECT EXISTS (
         SELECT 1
         FROM auth.role role
         INNER JOIN auth.role_permissions role_permission
           ON role_permission.id_rol = role.id
          AND COALESCE(role_permission.is_active, TRUE) = TRUE
         INNER JOIN auth.permission permission
           ON permission.id_permission = role_permission.id_permission
          AND permission.is_active = TRUE
         WHERE role.is_active = TRUE
           AND role.code = ANY($1::text[])
           AND permission.code = ANY($2::text[])
       ) AS allowed`,
      [roleCodes, codes],
    );

    if (!this.toBoolean(rows?.[0]?.allowed)) {
      throw new ForbiddenException(deniedMessage);
    }
  }

  /**
   * Devuelve los destinatarios activos que hoy tienen habilitado un permiso, a
   * través de cualquiera de sus roles activos. Se usa para avisar por correo a
   * quienes gestionan un tipo de trámite sin depender de un rol fijo: si un día
   * el permiso se asigna a otro rol, el aviso lo sigue automáticamente.
   *
   * El correo sale de la persona asociada al usuario y, si no la tiene, se cae
   * al username cuando este ya es una dirección válida. Los resultados vienen
   * deduplicados por correo (un mismo usuario puede tener el permiso por varios
   * roles a la vez).
   *
   * El nombre se arma con nombre + apellidos, que es lo que muestra Gestión de
   * Personas, y solo se cae a `nom_largo` cuando esos campos vienen vacíos:
   * algunas fichas de `auth.personas` tienen el `nom_largo` desactualizado
   * respecto del usuario real al que están asociadas.
   */
  async findActiveRecipientsWithPermission(
    permissionCode: string,
  ): Promise<Array<{ email: string; name: string | null }>> {
    const rows = await this.dataSource.query(
      `SELECT
          COALESCE(
            NULLIF(TRIM(person.dir_email), ''),
            NULLIF(TRIM(app_user.username), '')
          ) AS email,
          COALESCE(
            NULLIF(
              TRIM(
                CONCAT_WS(
                  ' ',
                  NULLIF(TRIM(person.nom_tercero), ''),
                  NULLIF(TRIM(person.pri_apellido), ''),
                  NULLIF(TRIM(person.seg_apellido), '')
                )
              ),
              ''
            ),
            NULLIF(TRIM(person.nom_largo), '')
          ) AS name
         FROM auth."user" app_user
         INNER JOIN auth.user_roles user_role
           ON user_role.id_user = app_user.id_user
          AND COALESCE(user_role.is_active, TRUE) = TRUE
         INNER JOIN auth.role role
           ON role.id = user_role.id_rol
          AND role.is_active = TRUE
         INNER JOIN auth.role_permissions role_permission
           ON role_permission.id_rol = role.id
          AND COALESCE(role_permission.is_active, TRUE) = TRUE
         INNER JOIN auth.permission permission
           ON permission.id_permission = role_permission.id_permission
          AND permission.is_active = TRUE
         LEFT JOIN auth.personas person
           ON person.id_person = app_user.id_person
        WHERE COALESCE(app_user.is_active, FALSE) = TRUE
          AND permission.code = $1`,
      [permissionCode],
    );

    const byEmail = new Map<string, { email: string; name: string | null }>();
    for (const row of Array.isArray(rows) ? rows : []) {
      const email = String(row?.email || '').trim();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;
      const key = email.toLowerCase();
      const existing = byEmail.get(key);
      const name = String(row?.name || '').trim() || null;
      if (!existing) {
        byEmail.set(key, { email, name });
      } else if (!existing.name && name) {
        existing.name = name;
      }
    }
    return Array.from(byEmail.values());
  }

  private extractSignedRoleCodes(roles: unknown): string[] {
    const source = Array.isArray(roles) ? roles : [roles];
    return Array.from(
      new Set(
        source
          .map((role: any) => (typeof role === 'string' ? role : role?.code))
          .map((role) => String(role || '').trim())
          .filter(Boolean),
      ),
    );
  }

  private toBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }
}
