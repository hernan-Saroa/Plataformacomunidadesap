import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import {
  AvisoConfigurado,
  avisoQueRige,
  EventoAviso,
  eventosDeActividad,
  leerAviso,
  PAPELES,
  PapelAviso,
} from './eventos';

/**
 * Los avisos de cada actividad (EFDS-1183).
 *
 * Se configuran en la ficha de la actividad, donde se decide todo lo demás de
 * ella, y sin modalidad: por actividad y modalidad eran cientos de
 * combinaciones que nadie iba a llenar.
 *
 * Hay dos clases de aviso:
 *
 * - **Los que salen siempre**: los de la aprobación. Su destinatario es quien
 *   la envió o quien la aprueba en ese proceso, no se puede decir de otra forma
 *   y no se ofrece apagarlos.
 * - **Los que se configuran**: se encienden o apagan, y además de a quien
 *   corresponda de por sí, llegan a las dependencias, roles y personas que se
 *   elijan. Mientras nadie los cambie rige lo sugerido.
 */
@Injectable()
export class AvisosService {
  private readonly logger = new Logger(AvisosService.name);

  constructor(private readonly dataSource: DataSource) {}

  /** Lo que alguien cambió en esa actividad, por evento. Sin la tabla, nada. */
  private async cambiados(numeral: string): Promise<Map<string, AvisoConfigurado>> {
    try {
      const filas = await this.dataSource.query(
        `SELECT evento, activo, papeles, roles, personas, dependencias
           FROM hiring.avisos WHERE numeral = $1`,
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
    return avisoQueRige(evento, (await this.cambiados(numeral)).get(evento), numeral);
  }

  /** Si la actividad exige aprobación en alguna modalidad, con alguien que la dé. */
  private async requiereAprobacion(numeral: string): Promise<boolean> {
    try {
      const [fila] = await this.dataSource.query(
        `SELECT EXISTS (
           SELECT 1 FROM hiring.reglas_actividad
            WHERE tipo = 'EXIGE_APROBACION'
              AND vigente_hasta IS NULL
              AND numeral = $1
              AND (jsonb_array_length(COALESCE(config -> 'roles', '[]'::jsonb)) > 0
                OR jsonb_array_length(COALESCE(config -> 'personas', '[]'::jsonb)) > 0)
         ) AS requiere`,
        [numeral],
      );
      return fila?.requiere === true;
    } catch {
      return false;
    }
  }

  /**
   * Las dependencias de la ESAP, del catálogo de la plataforma.
   *
   * Se leen de `auth.dependencias`, que administra la plataforma y consumen
   * también viáticos y control interno: contratación no mantiene otra lista.
   * La columna `activo` no existe en todas las instalaciones, así que se lee
   * sin nombrarla.
   */
  async dependencias(): Promise<{ id: string; nombre: string }[]> {
    try {
      const filas = await this.dataSource.query(
        `SELECT d.id_dependencia::text AS id,
                d.nom_dependencia      AS nombre,
                to_jsonb(d) ->> 'activo' AS activo
           FROM auth.dependencias d
          WHERE d.nom_dependencia IS NOT NULL
          ORDER BY d.nom_dependencia`,
      );
      return filas.filter((f: any) => f.activo !== 'false').map((f: any) => ({ id: f.id, nombre: f.nombre }));
    } catch (error: any) {
      this.logger.warn(`Dependencias no disponibles: ${error.message}`);
      return [];
    }
  }

  private async nombresDeDependencias(ids: string[]) {
    if (!ids.length) return new Map<string, string>();
    const todas = await this.dependencias();
    return new Map(todas.filter((d) => ids.includes(d.id)).map((d) => [d.id, d.nombre]));
  }

  /** Los avisos de la actividad, con nombres legibles, para la ficha. */
  async deActividad(numeral: string) {
    const [cambiados, requiere] = await Promise.all([
      this.cambiados(numeral),
      this.requiereAprobacion(numeral),
    ]);
    const nombrePapel = (codigo: PapelAviso) => PAPELES.find((p) => p.codigo === codigo)?.nombre ?? codigo;

    const definiciones = eventosDeActividad(numeral);

    // Los de la aprobación solo se muestran donde hay aprobación: en otra
    // actividad nunca salen, y listarlos haría creer que sí.
    const siempre = definiciones
      .filter((e) => e.siempre && requiere)
      .map((e) => {
        const aviso = avisoQueRige(e.codigo, undefined, numeral);
        return {
          evento: e.codigo,
          nombre: e.nombre,
          ayuda: e.ayuda,
          aQuien: aviso.papeles.map(nombrePapel),
        };
      });

    const configurables = definiciones
      .filter((e) => !e.siempre)
      .map((e) => ({ definicion: e, aviso: avisoQueRige(e.codigo, cambiados.get(e.codigo), numeral) }));

    const roles = [...new Set(configurables.flatMap((a) => a.aviso.roles))];
    const nombresRol: { code: string; name: string }[] = roles.length
      ? await this.dataSource.query(`SELECT code, name FROM auth.role WHERE code = ANY($1::text[])`, [roles])
      : [];

    const personas = [...new Set(configurables.flatMap((a) => a.aviso.personas))];
    const nombresPersona: { id: string; nombre: string }[] = personas.length
      ? await this.dataSource.query(
          `SELECT id_person::text AS id, COALESCE(nom_largo, nom_tercero) AS nombre
             FROM auth.personas
            WHERE id_person::text = ANY($1::text[])`,
          [personas],
        )
      : [];

    const nombresDependencia = await this.nombresDeDependencias([
      ...new Set(configurables.flatMap((a) => a.aviso.dependencias)),
    ]);

    return {
      papeles: PAPELES,
      requiereAprobacion: requiere,
      siempre,
      avisos: configurables.map(({ definicion, aviso }) => ({
        evento: definicion.codigo,
        nombre: definicion.nombre,
        ayuda: definicion.ayudaEn?.(numeral) ?? definicion.ayuda,
        personalizado: aviso.personalizado,
        activo: aviso.activo,
        // Los que reciben el aviso de por sí: no se eligen ni se quitan.
        papeles: aviso.papeles,
        // Lo borrado después de configurarse se muestra, para que se vea que
        // ahí hay algo roto y se pueda quitar.
        dependencias: aviso.dependencias.map((id) => ({
          id,
          nombre: nombresDependencia.get(id) ?? 'Dependencia que ya no está',
        })),
        roles: aviso.roles.map((code) => ({
          code,
          name: nombresRol.find((n) => n.code === code)?.name ?? code,
        })),
        personas: aviso.personas.map((id) => ({
          id,
          nombre: nombresPersona.find((p) => p.id === id)?.nombre ?? 'Persona que ya no está',
        })),
      })),
    };
  }

  async guardar(
    numeral: string,
    evento: string,
    cambios: { activo?: boolean; roles?: string[]; personas?: string[]; dependencias?: string[] },
    acceso: HiringAccess,
  ) {
    const definicion = eventosDeActividad(numeral).find((e) => e.codigo === evento);
    if (!definicion) {
      throw new BadRequestException(`La actividad ${numeral} no tiene el aviso ${evento}`);
    }
    if (definicion.siempre) {
      throw new BadRequestException('Este aviso sale siempre y no se configura');
    }

    const actual = await this.queRige(numeral, definicion.codigo);
    const siguiente = {
      activo: cambios.activo ?? actual.activo,
      roles: [...new Set(cambios.roles ?? actual.roles)],
      personas: [...new Set(cambios.personas ?? actual.personas)],
      dependencias: [...new Set((cambios.dependencias ?? actual.dependencias).map(String))],
    };

    // Encendido sin nadie a quien avisar no avisaría nada, y diría que sí.
    const sinNadie =
      !actual.papeles.length &&
      !siguiente.roles.length &&
      !siguiente.personas.length &&
      !siguiente.dependencias.length;
    if (siguiente.activo && sinNadie) {
      throw new BadRequestException('Elige a quién avisar antes de encenderlo');
    }

    await this.dataSource.query(
      `INSERT INTO hiring.avisos
              (numeral, evento, activo, papeles, roles, personas, dependencias, updated_at, updated_by)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, now(), $8)
       ON CONFLICT (numeral, evento) DO UPDATE
          SET activo = EXCLUDED.activo,
              papeles = EXCLUDED.papeles,
              roles = EXCLUDED.roles,
              personas = EXCLUDED.personas,
              dependencias = EXCLUDED.dependencias,
              updated_at = now(),
              updated_by = EXCLUDED.updated_by`,
      [
        numeral,
        definicion.codigo,
        siguiente.activo,
        JSON.stringify(actual.papeles),
        JSON.stringify(siguiente.roles),
        JSON.stringify(siguiente.personas),
        JSON.stringify(siguiente.dependencias),
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
