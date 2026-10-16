import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

/** El llamador conserva el manager y controla commit, rollback y savepoints. */
export interface RundAuthWriteManager { query(sql: string, params?: any[]): Promise<any[]> }
export interface RundAuthWriteInput {
  payload: {
    documentNumber: string | null; documentType: string | null;
    primer_nombre: string | null; primer_apellido: string | null; segundo_apellido: string | null;
    genero: string | null; fechaNacimiento: Date | null;
  };
  options: { relaxValidation?: boolean; preserveTerritorial?: boolean };
  territorial?: { id: string };
  emailFinal: string;
  phoneFinal: string | null;
  finalFullName: string;
}
export interface RundAuthWriteNormalization {
  formatDateOnly(value: any): string | null;
  splitFullName(value: string | null): { primer_nombre: string | null; primer_apellido: string | null };
  normalizeLookupText(value: any): string;
}
export interface RundAuthWriteResult {
  authPersonId: string;
  authUser: { id_user: string };
  authUserCreated: boolean;
  personaChangedFields: string[];
  profileChanges: Record<string, { anterior: any; nuevo: any }>;
}

/** Adaptador propietario: SQL de identidad conservado del bloque RUND del punto 60.
 * No abre otra conexión/transacción, no hace HTTP, no confirma ni compensa cambios.
 * Solo admite las reglas de normalización del llamador, nunca opciones del body HTTP.
 */
export async function upsertRundAuthIdentityWithManager(
  manager: RundAuthWriteManager, input: RundAuthWriteInput, normalization: RundAuthWriteNormalization,
): Promise<RundAuthWriteResult> {
  const { payload, options, territorial, emailFinal, phoneFinal, finalFullName } = input;
  const { formatDateOnly, splitFullName, normalizeLookupText } = normalization;
  const existingPersonaRows = await manager.query(
    `
    SELECT *
    FROM auth.personas
    WHERE UPPER(regexp_replace(BTRIM(num_identificacion::text), '\\.', '', 'g'))
        = UPPER(regexp_replace(BTRIM($1::text), '\\.', '', 'g'))
    LIMIT 1
    `,
    [payload.documentNumber],
  );
  let authPersona = existingPersonaRows[0] || null;
  const personaChangedFields: string[] = [];
  const profileChanges: Record<string, { anterior: any; nuevo: any }> = {};

  // Autogestión: el correo fue verificado por OTP y es la llave confiable.
  // Si no encontramos la persona por documento (p.ej. el docente no recordó/
  // escribió mal su cédula), la resolvemos por correo para apuntar al registro
  // correcto y evitar un falso "correo en uso por otra persona".
  if (!authPersona && options.relaxValidation) {
    const byEmailRows = await manager.query(
      `SELECT * FROM auth.personas WHERE LOWER(dir_email) = LOWER($1) LIMIT 1`,
      [emailFinal],
    );
    if (byEmailRows[0]) authPersona = byEmailRows[0];
  }

  const emailConflictRows = await manager.query(
    `
    SELECT owner_id
    FROM (
      SELECT p.id_person::text AS owner_id
      FROM auth.personas p
      WHERE LOWER(p.dir_email) = LOWER($1)
      UNION
      SELECT u.id_person::text AS owner_id
      FROM auth."user" u
      WHERE LOWER(u.username) = LOWER($1)
    ) owners
    WHERE owner_id IS NULL OR $2::uuid IS NULL OR owner_id::uuid <> $2::uuid
    LIMIT 1
    `,
    [emailFinal, authPersona?.id_person || null],
  );

  if (emailConflictRows[0]) {
    throw new BadRequestException({
      message: `El correo ${emailFinal} ya estÃ¡ en uso por otra persona o usuario.`,
      columna: 'CORREO_INSTITUCIONAL',
      datoErrado: emailFinal,
      valorEsperado: 'Correo Ãºnico'
    });
  }

  // Auth usa bigint: transmitir el ID textual evita redondearlo antes de validar la FK.
  const authSeccionalId = !options.preserveTerritorial && territorial?.id ? territorial.id : null;
  const authPersonId = authPersona?.id_person || randomUUID();
  const firstName = payload.primer_nombre || splitFullName(finalFullName).primer_nombre || 'Docente';
  const lastName = payload.primer_apellido || splitFullName(finalFullName).primer_apellido || null;
  const genderText = normalizeLookupText(payload.genero || 'N');
  const gender = ['m', 'masculino'].includes(genderText) ? 'M'
    : ['f', 'femenino'].includes(genderText) ? 'F'
      : (payload.genero || 'N').trim().toUpperCase().slice(0, 20);

  if (!authPersona) {
    const legacyPersonId = await getNextAuthLegacyPersonId(manager);
    const columns = [
      'id_person',
      ...(legacyPersonId ? ['id_tercero'] : []),
      'num_identificacion',
      'tip_identificacion',
      'nom_largo',
      'nom_tercero',
      'pri_apellido',
      'seg_apellido',
      'gen_tercero',
      'fec_nacimiento',
      'dir_email',
      'tel_celular',
      'id_seccional',
      'fec_creacion',
      'fec_modificacion',
    ];
    const values = [
      authPersonId,
      ...(legacyPersonId ? [legacyPersonId] : []),
      payload.documentNumber,
      payload.documentType || 'CC',
      finalFullName,
      firstName,
      lastName,
      payload.segundo_apellido,
      gender || 'N',
      formatDateOnly(payload.fechaNacimiento),
      emailFinal,
      phoneFinal,
      authSeccionalId,
    ];
    const placeholders = values.map((_, idx) => `$${idx + 1}`);
    await manager.query(
      `
      INSERT INTO auth.personas (${columns.slice(0, -2).join(', ')}, fec_creacion, fec_modificacion)
      VALUES (${placeholders.join(', ')}, CURRENT_DATE, CURRENT_DATE)
      `,
      values,
    );
    authPersona = { id_person: authPersonId };
  } else {
    const personaCandidates: Record<string, any> = {
      tip_identificacion: payload.documentType || authPersona.tip_identificacion || 'CC',
      nom_largo: finalFullName,
      nom_tercero: firstName,
      pri_apellido: lastName,
      seg_apellido: payload.segundo_apellido,
      gen_tercero: gender || authPersona.gen_tercero || 'N',
      fec_nacimiento: payload.fechaNacimiento || authPersona.fec_nacimiento || null,
      dir_email: emailFinal,
      tel_celular: phoneFinal || authPersona.tel_celular || null,
      id_seccional: authSeccionalId || authPersona.id_seccional || null,
    };
    for (const [field, nextValue] of Object.entries(personaCandidates)) {
      const previousValue = authPersona[field];
      const normalizedPrevious = field === 'fec_nacimiento'
        ? formatDateOnly(previousValue)
        : String(previousValue ?? '').trim();
      const normalizedNext = field === 'fec_nacimiento'
        ? formatDateOnly(nextValue)
        : String(nextValue ?? '').trim();
      if (normalizedNext !== normalizedPrevious) {
        personaChangedFields.push(field);
        profileChanges[field] = { anterior: previousValue ?? null, nuevo: nextValue ?? null };
      }
    }
    if (personaChangedFields.length > 0) {
      await manager.query(
        `
        UPDATE auth.personas
        SET
          tip_identificacion = $2,
          nom_largo = $3,
          nom_tercero = $4,
          pri_apellido = $5,
          seg_apellido = $6,
          gen_tercero = $7,
          fec_nacimiento = $8,
          dir_email = $9,
          tel_celular = $10,
          id_seccional = COALESCE($11, id_seccional),
          fec_modificacion = CURRENT_DATE
        WHERE id_person = $1
        `,
        [
          authPersonId,
          payload.documentType || authPersona.tip_identificacion || 'CC',
          finalFullName,
          firstName,
          lastName,
          payload.segundo_apellido,
          gender || authPersona.gen_tercero || 'N',
          formatDateOnly(payload.fechaNacimiento || authPersona.fec_nacimiento),
          emailFinal,
          phoneFinal || authPersona.tel_celular || null,
          authSeccionalId,
        ],
      );
    }
  }

  const userRows = await manager.query(
    `SELECT * FROM auth."user" WHERE id_person = $1 LIMIT 1`,
    [authPersonId],
  );
  let authUser = userRows[0] || null;
  let authUserCreated = false;

  if (!authUser) {
    const passwordHash = await bcrypt.hash(payload.documentNumber!, 10);
    const userId = randomUUID();
    await manager.query(
      `
      INSERT INTO auth."user" (
        id_user,
        public_id,
        username,
        password_hash,
        id_person,
        is_active,
        password_temp,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, false, true, now(), now())
      `,
      [userId, randomUUID(), emailFinal, passwordHash, authPersonId],
    );
    authUser = { id_user: userId };
    authUserCreated = true;
  } else if (String(authUser.username || '').trim().toLowerCase() !== emailFinal) {
    personaChangedFields.push('username');
    profileChanges.username = { anterior: authUser.username || null, nuevo: emailFinal };
    await manager.query(
      `
      UPDATE auth."user"
      SET username = $2, updated_at = now()
      WHERE id_user = $1
      `,
      [authUser.id_user, emailFinal],
    );
  }

  const roleRows = await manager.query(
    `
    SELECT id
    FROM auth.role
    WHERE UPPER(code) = 'DOCENTE' OR UPPER(name) = 'DOCENTE'
    ORDER BY CASE WHEN UPPER(code) = 'DOCENTE' THEN 0 ELSE 1 END
    LIMIT 1
    `,
  );
  const docenteRoleId = roleRows[0]?.id;
  if (!docenteRoleId) throw new BadRequestException('No existe el rol DOCENTE en auth.role.');

  await manager.query(
    `
    INSERT INTO auth.user_roles (id_user, id_rol, is_active, created_at, updated_at)
    VALUES ($1, $2, true, now(), now())
    ON CONFLICT (id_user, id_rol)
    DO UPDATE SET is_active = true, updated_at = now()
    WHERE user_roles.is_active IS DISTINCT FROM true
    `,
    [authUser.id_user, docenteRoleId],
  );

  return { authPersonId, authUser, authUserCreated, personaChangedFields, profileChanges };
}

async function getNextAuthLegacyPersonId(manager: RundAuthWriteManager): Promise<string | null> {
  const [columnInfo] = await manager.query(
    `
      SELECT column_default
      FROM information_schema.columns
      WHERE table_schema = 'auth'
        AND table_name = 'personas'
        AND column_name = 'id_tercero'
      LIMIT 1
    `,
  );

  if (!columnInfo) return null;

  const columnDefault = typeof columnInfo.column_default === 'string' ? columnInfo.column_default : null;
  if (columnDefault?.includes('nextval')) {
    const [nextValue] = await manager.query(
      `SELECT nextval(pg_get_serial_sequence($1, 'id_tercero')) AS next_id`,
      ['auth.personas'],
    );
    return String(nextValue.next_id);
  }

  await manager.query(`LOCK TABLE auth.personas IN EXCLUSIVE MODE`);
  const [nextValue] = await manager.query(
    `SELECT COALESCE(MAX(id_tercero), 0) + 1 AS next_id FROM auth.personas`,
  );
  return String(nextValue.next_id);
}

