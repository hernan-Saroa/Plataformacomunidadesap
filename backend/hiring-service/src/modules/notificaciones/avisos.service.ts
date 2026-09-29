import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import {
  AvisoConfigurado,
  avisoQueRige,
  esCorreo,
  EventoAviso,
  eventosDeActividad,
  leerAviso,
  mensajeDeAviso,
  PAPELES,
  PapelAviso,
  VARIABLES_AVISO,
  variablesDesconocidas,
} from './eventos';

/** Lo que se puede cambiar de un aviso; lo que no llega se conserva. */
export interface CambiosAviso {
  activo?: boolean;
  roles?: string[];
  personas?: string[];
  dependencias?: string[];
  /** Texto propio con variables; `null` o vacío vuelve al de siempre. */
  titulo?: string | null;
  mensaje?: string | null;
  correosExternos?: string[];
  alContratista?: boolean;
}

/**
 * Un texto propio no puede pasarse de largo ni nombrar variables que no
 * existen: `{actvidad}` saldría tal cual en el correo de todo el que lo reciba.
 */
function validarTexto(texto: string | null, que: string, maximo: number) {
  if (!texto) return;
  if (texto.length > maximo) {
    throw new BadRequestException(`El ${que} del aviso admite hasta ${maximo} caracteres`);
  }
  const desconocidas = variablesDesconocidas(texto);
  if (desconocidas.length) {
    throw new BadRequestException(
      `El ${que} usa variables que no existen: ${desconocidas.map((v) => `{${v}}`).join(', ')}. ` +
        `Las que hay son ${VARIABLES_AVISO.map((v) => `{${v.clave}}`).join(', ')}.`,
    );
  }
}

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
        `SELECT evento, activo, papeles, roles, personas, dependencias,
                to_jsonb(a) -> 'titulo'           AS titulo,
                to_jsonb(a) -> 'mensaje'          AS mensaje,
                to_jsonb(a) -> 'correos_externos' AS correos_externos,
                to_jsonb(a) -> 'al_contratista'   AS al_contratista
           FROM hiring.avisos a WHERE numeral = $1`,
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

  /**
   * Si los avisos de la actividad salen también por correo.
   *
   * Encendido si no se sabe: se acordó como estándar, y una consulta que falla
   * no debería callar el correo de toda una actividad.
   */
  async porCorreo(numeral: string): Promise<boolean> {
    try {
      const [fila] = await this.dataSource.query(
        `SELECT avisos_por_correo FROM hiring.actividades WHERE numeral = $1`,
        [numeral],
      );
      return fila?.avisos_por_correo !== false;
    } catch {
      return true;
    }
  }

  /** Enciende o apaga el correo de los avisos de la actividad. */
  async guardarCorreo(numeral: string, porCorreo: boolean) {
    const filas = await this.dataSource.query(
      `UPDATE hiring.actividades SET avisos_por_correo = $2 WHERE numeral = $1 RETURNING numeral`,
      [numeral, porCorreo === true],
    );
    if (!filas.length) throw new BadRequestException(`La actividad ${numeral} no existe`);
    return this.deActividad(numeral);
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
    const [cambiados, requiere, porCorreo] = await Promise.all([
      this.cambiados(numeral),
      this.requiereAprobacion(numeral),
      this.porCorreo(numeral),
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

    const [actividad] = await this.dataSource
      .query(`SELECT nombre FROM hiring.actividades WHERE numeral = $1`, [numeral])
      .catch(() => []);

    return {
      papeles: PAPELES,
      requiereAprobacion: requiere,
      porCorreo,
      siempre,
      /** Lo que se puede escribir entre llaves en el texto de un aviso. */
      variables: VARIABLES_AVISO,
      avisos: configurables.map(({ definicion, aviso }) => ({
        evento: definicion.codigo,
        nombre: definicion.nombre,
        ayuda: definicion.ayudaEn?.(numeral) ?? definicion.ayuda,
        personalizado: aviso.personalizado,
        activo: aviso.activo,
        titulo: aviso.titulo,
        mensaje: aviso.mensaje,
        /**
         * Cómo sale hoy, con datos de ejemplo: es lo que se ve en el campo
         * vacío, para que quien lo reescribe sepa de qué parte.
         */
        textoDeSiempre: mensajeDeAviso(
          {
            evento: definicion.codigo,
            numeral,
            actorNombre: 'Ana Pérez',
            observaciones: 'Falta el certificado de experiencia',
            plazo: { vence: '2026-10-15', vencido: false },
          },
          actividad?.nombre ?? null,
          'LP-001-2026',
        ),
        correosExternos: aviso.correosExternos,
        alContratista: aviso.alContratista,
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
    cambios: CambiosAviso,
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
    // `null` o vacío borra el texto propio y vuelve al de siempre; sin la
    // clave, se conserva el que había.
    const textoNuevo = (valor: string | null | undefined, anterior: string | null) =>
      valor === undefined ? anterior : valor?.trim() || null;
    const siguiente = {
      activo: cambios.activo ?? actual.activo,
      roles: [...new Set(cambios.roles ?? actual.roles)],
      personas: [...new Set(cambios.personas ?? actual.personas)],
      dependencias: [...new Set((cambios.dependencias ?? actual.dependencias).map(String))],
      titulo: textoNuevo(cambios.titulo, actual.titulo),
      mensaje: textoNuevo(cambios.mensaje, actual.mensaje),
      correosExternos: [
        ...new Set((cambios.correosExternos ?? actual.correosExternos).map((c) => c.trim().toLowerCase())),
      ].filter(Boolean),
      alContratista: cambios.alContratista ?? actual.alContratista,
    };

    validarTexto(siguiente.titulo, 'título', 120);
    validarTexto(siguiente.mensaje, 'mensaje', 1000);
    const invalidos = siguiente.correosExternos.filter((c) => !esCorreo(c));
    if (invalidos.length) {
      throw new BadRequestException(`No parece un correo válido: ${invalidos.join(', ')}`);
    }
    if (siguiente.correosExternos.length > 20) {
      throw new BadRequestException('Un aviso admite hasta 20 correos externos');
    }

    // Encendido sin nadie a quien avisar no avisaría nada, y diría que sí.
    const sinNadie =
      !actual.papeles.length &&
      !siguiente.roles.length &&
      !siguiente.personas.length &&
      !siguiente.dependencias.length &&
      !siguiente.correosExternos.length &&
      !siguiente.alContratista;
    if (siguiente.activo && sinNadie) {
      throw new BadRequestException('Elige a quién avisar antes de encenderlo');
    }

    await this.dataSource.query(
      `INSERT INTO hiring.avisos
              (numeral, evento, activo, papeles, roles, personas, dependencias,
               titulo, mensaje, correos_externos, al_contratista, updated_at, updated_by)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9, $10::jsonb, $11, now(), $12)
       ON CONFLICT (numeral, evento) DO UPDATE
          SET activo = EXCLUDED.activo,
              papeles = EXCLUDED.papeles,
              roles = EXCLUDED.roles,
              personas = EXCLUDED.personas,
              dependencias = EXCLUDED.dependencias,
              titulo = EXCLUDED.titulo,
              mensaje = EXCLUDED.mensaje,
              correos_externos = EXCLUDED.correos_externos,
              al_contratista = EXCLUDED.al_contratista,
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
        siguiente.titulo,
        siguiente.mensaje,
        JSON.stringify(siguiente.correosExternos),
        siguiente.alContratista,
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
