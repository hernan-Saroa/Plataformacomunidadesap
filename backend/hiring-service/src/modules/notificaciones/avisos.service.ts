import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import {
  AvisoConfigurado,
  avisoQueRige,
  esPapel,
  EventoAviso,
  eventosDeActividad,
  leerAviso,
  PAPELES,
} from './eventos';

/**
 * Los avisos de cada actividad (EFDS-1183).
 *
 * Se configuran en la ficha de la actividad, donde se decide todo lo demás de
 * ella, y sin modalidad: por actividad y modalidad eran cientos de
 * combinaciones que nadie iba a llenar.
 *
 * Mientras nadie cambie un aviso rige lo sugerido, así que las 55 actividades
 * avisan desde el primer día sin que alguien las configure una por una.
 */
@Injectable()
export class AvisosService {
  private readonly logger = new Logger(AvisosService.name);

  constructor(private readonly dataSource: DataSource) {}

  /** Lo que alguien cambió en esa actividad, por evento. Sin la tabla, nada. */
  private async cambiados(numeral: string): Promise<Map<string, AvisoConfigurado>> {
    try {
      const filas = await this.dataSource.query(
        `SELECT evento, activo, papeles, roles FROM hiring.avisos WHERE numeral = $1`,
        [numeral],
      );
      const mapa = new Map<string, AvisoConfigurado>();
      for (const f of filas) {
        const aviso = leerAviso(f);
        if (aviso) mapa.set(aviso.evento, aviso);
      }
      return mapa;
    } catch (error: any) {
      this.logger.warn(`Avisos no disponibles, rige lo sugerido: ${error.message}`);
      return new Map();
    }
  }

  /** El aviso que rige para un evento en una actividad. */
  async queRige(numeral: string, evento: EventoAviso): Promise<AvisoConfigurado> {
    return avisoQueRige(evento, (await this.cambiados(numeral)).get(evento));
  }

  /** Los avisos de la actividad, con nombres legibles, para la ficha. */
  async deActividad(numeral: string) {
    const cambiados = await this.cambiados(numeral);
    const avisos = eventosDeActividad(numeral).map((e) => ({
      definicion: e,
      aviso: avisoQueRige(e.codigo, cambiados.get(e.codigo)),
    }));

    const roles = [...new Set(avisos.flatMap((a) => a.aviso.roles))];
    const nombres: { code: string; name: string }[] = roles.length
      ? await this.dataSource.query(`SELECT code, name FROM auth.role WHERE code = ANY($1::text[])`, [
          roles,
        ])
      : [];

    return {
      papeles: PAPELES,
      avisos: avisos.map(({ definicion, aviso }) => ({
        evento: definicion.codigo,
        nombre: definicion.nombre,
        ayuda: definicion.ayuda,
        personalizado: aviso.personalizado,
        activo: aviso.activo,
        papeles: aviso.papeles,
        // Un rol borrado después de configurarse se muestra por su código:
        // quien administra tiene que ver que ahí hay algo roto.
        roles: aviso.roles.map((code) => ({
          code,
          name: nombres.find((n) => n.code === code)?.name ?? code,
        })),
      })),
    };
  }

  async guardar(
    numeral: string,
    evento: string,
    cambios: { activo?: boolean; papeles?: string[]; roles?: string[] },
    acceso: HiringAccess,
  ) {
    const definicion = eventosDeActividad(numeral).find((e) => e.codigo === evento);
    if (!definicion) {
      throw new BadRequestException(`La actividad ${numeral} no tiene el aviso ${evento}`);
    }

    const papeles = cambios.papeles?.filter(esPapel);
    if (cambios.papeles && papeles?.length !== cambios.papeles.length) {
      throw new BadRequestException('Alguno de los papeles no existe');
    }

    const actual = await this.queRige(numeral, definicion.codigo);
    const siguiente = {
      activo: cambios.activo ?? actual.activo,
      papeles: [...new Set(papeles ?? actual.papeles)],
      roles: [...new Set(cambios.roles ?? actual.roles)],
    };

    // Encendido sin nadie a quien avisar no avisaría nada, y diría que sí.
    if (siguiente.activo && !siguiente.papeles.length && !siguiente.roles.length) {
      throw new BadRequestException('Elige a quién avisar antes de encenderlo');
    }

    await this.dataSource.query(
      `INSERT INTO hiring.avisos (numeral, evento, activo, papeles, roles, updated_at, updated_by)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, now(), $6)
       ON CONFLICT (numeral, evento) DO UPDATE
          SET activo = EXCLUDED.activo,
              papeles = EXCLUDED.papeles,
              roles = EXCLUDED.roles,
              updated_at = now(),
              updated_by = EXCLUDED.updated_by`,
      [
        numeral,
        definicion.codigo,
        siguiente.activo,
        JSON.stringify(siguiente.papeles),
        JSON.stringify(siguiente.roles),
        acceso.userName ?? null,
      ],
    );

    return this.deActividad(numeral);
  }

  /** Vuelve a lo sugerido: se borra lo que se había cambiado. */
  async restablecer(numeral: string, evento: string) {
    await this.dataSource.query(`DELETE FROM hiring.avisos WHERE numeral = $1 AND evento = $2`, [
      numeral,
      evento,
    ]);
    return this.deActividad(numeral);
  }
}
