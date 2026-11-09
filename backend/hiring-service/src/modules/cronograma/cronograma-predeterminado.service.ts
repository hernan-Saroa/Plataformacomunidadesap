import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import { DiaNoHabil } from '../../entities/dia-no-habil.entity';
import { festivosEntre } from '../publicacion/festivos-colombia';
import { fechasDelPredeterminado, FilaPredeterminada, validarPredeterminado } from './cronograma-predeterminado';
import { GuardarPredeterminadoDto } from './dto/cronograma-predeterminado.dto';

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Cronograma predeterminado por modalidad (140, EFDS-1152).
 *
 * Se configura en Configuración → Cronograma y se usa en la 5.2: con el día
 * cero que se elija salen las fechas de cada actividad, como propuesta que se
 * revisa antes de guardar. Nunca escribe en el cronograma de un proceso.
 */
@Injectable()
export class CronogramaPredeterminadoService {
  constructor(private readonly dataSource: DataSource) {}

  /** Cuántas actividades tiene configuradas cada modalidad, para el selector. */
  async resumen() {
    const filas: any[] = await this.dataSource.query(
      `SELECT m.codigo, m.nombre, count(c.id)::int AS actividades, max(c.updated_at) AS actualizado_at
         FROM hiring.modalidades m
         LEFT JOIN hiring.cronograma_predeterminado c ON c.modalidad = m.codigo
        WHERE m.activa
        GROUP BY m.codigo, m.nombre, m.orden
        ORDER BY m.orden, m.nombre`,
    );
    return filas.map((f) => ({
      modalidad: f.codigo as string,
      nombre: f.nombre as string,
      actividades: Number(f.actividades),
      actualizadoAt: (f.actualizado_at as Date | null) ?? null,
    }));
  }

  /**
   * El predeterminado de una modalidad: todas sus actividades de las etapas 5
   * a 10, con lo configurado si lo tienen, y las propias.
   */
  async consultar(modalidad: string) {
    const nombre = await this.exigirModalidad(modalidad);
    const catalogo = await this.catalogo(modalidad);
    const filas = await this.filas(modalidad);
    const porNumeral = new Map(filas.filter((f) => f.numeral).map((f) => [f.numeral!, f]));

    return {
      modalidad,
      nombre,
      actividades: catalogo.map((a) => ({
        numeral: a.numeral,
        nombre: a.nombre,
        etapa: Number(a.etapa),
        configuracion: porNumeral.get(a.numeral) ?? null,
      })),
      propias: filas.filter((f) => !f.numeral),
      actualizadoPor: filas.map((f) => f.actualizadoPor).find(Boolean) ?? null,
    };
  }

  /** Reemplaza el predeterminado entero de la modalidad. */
  async guardar(modalidad: string, dto: GuardarPredeterminadoDto, acceso: HiringAccess) {
    await this.exigirModalidad(modalidad);
    const catalogo = await this.catalogo(modalidad);
    validarPredeterminado(dto.filas, new Set(catalogo.map((a) => a.numeral)));

    await this.dataSource.transaction(async (em) => {
      await em.query(`DELETE FROM hiring.cronograma_predeterminado WHERE modalidad = $1`, [modalidad]);
      for (const f of dto.filas) {
        await em.query(
          `INSERT INTO hiring.cronograma_predeterminado
                  (modalidad, numeral, nombre, etapa, dia_inicio, dia_fin, tipo_dias, dias_antes,
                   avisar_a, canal, correos, nota, updated_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11::jsonb, $12, $13)`,
          [
            modalidad,
            f.numeral || null,
            f.numeral ? null : f.nombre!.trim(),
            f.numeral ? null : f.etapa,
            f.diaInicio ?? null,
            f.diaFin,
            f.tipoDias || 'HABILES',
            f.diasAntes ?? null,
            JSON.stringify(f.avisarA ?? []),
            f.canal || 'CAMPANA',
            JSON.stringify((f.correos ?? []).map((c) => c.trim().toLowerCase()).filter(Boolean)),
            f.nota?.trim() || null,
            acceso.userName ?? null,
          ],
        );
      }
    });

    return this.consultar(modalidad);
  }

  /**
   * Las fechas que propone el predeterminado de la modalidad del proceso, con
   * el día cero dado. No guarda nada: la 5.2 las carga en el formulario.
   *
   * Lo del flujo que la modalidad del proceso no recorre se deja fuera: el
   * predeterminado pudo configurarse antes de que la actividad se excluyera.
   */
  async propuesta(procesoId: string, diaCero: string) {
    if (!FECHA.test(diaCero ?? '')) {
      throw new BadRequestException('Indica el día cero del cronograma (YYYY-MM-DD)');
    }
    const [proceso] = await this.dataSource.query(
      `SELECT p.modalidad, m.nombre FROM hiring.procesos p
         LEFT JOIN hiring.modalidades m ON m.codigo = p.modalidad
        WHERE p.id = $1`,
      [procesoId],
    );
    if (!proceso) throw new NotFoundException('El proceso no existe');
    if (!proceso.modalidad) {
      return { modalidad: null, modalidadNombre: null, diaCero, actividades: [] };
    }

    const catalogo = await this.catalogo(proceso.modalidad);
    const enElProceso = new Map(catalogo.map((a) => [a.numeral, a]));
    const filas = (await this.filas(proceso.modalidad)).filter((f) => !f.numeral || enElProceso.has(f.numeral));

    const anio = Number(diaCero.slice(0, 4));
    const festivos = festivosEntre(anio, anio + 2);
    for (const dia of await this.dataSource.getRepository(DiaNoHabil).find()) festivos.add(dia.fecha);

    return {
      modalidad: proceso.modalidad as string,
      modalidadNombre: (proceso.nombre as string | null) ?? proceso.modalidad,
      diaCero,
      actividades: fechasDelPredeterminado(filas, diaCero, festivos).map((f) => ({
        numeral: f.numeral ?? null,
        nombre: f.numeral ? enElProceso.get(f.numeral)!.nombre : f.nombre!,
        etapa: f.numeral ? Number(enElProceso.get(f.numeral)!.etapa) : Number(f.etapa),
        fechaInicio: f.fechaInicio,
        fechaFin: f.fechaFin,
        diasAntes: f.diasAntes ?? null,
        avisarA: f.avisarA ?? [],
        canal: f.canal ?? 'CAMPANA',
        correos: f.correos ?? [],
        nota: f.nota ?? null,
      })),
    };
  }

  // ----------------------------------------------------------- auxiliares --

  private async exigirModalidad(modalidad: string): Promise<string> {
    const [fila] = await this.dataSource.query(`SELECT nombre FROM hiring.modalidades WHERE codigo = $1`, [
      modalidad,
    ]);
    if (!fila) throw new NotFoundException(`La modalidad ${modalidad} no existe`);
    return fila.nombre as string;
  }

  /** Las actividades del flujo de las etapas 5 a 10 que recorre la modalidad. */
  private catalogo(modalidad: string): Promise<{ numeral: string; nombre: string; etapa: number }[]> {
    return this.dataSource.query(
      `SELECT a.numeral, a.nombre, a.etapa
         FROM hiring.actividades a
        WHERE a.activa AND a.etapa BETWEEN 5 AND 10
          AND NOT EXISTS (SELECT 1 FROM hiring.actividades_excluidas x
                           WHERE x.numeral = a.numeral AND x.modalidad = $1)
        ORDER BY a.etapa, a.orden`,
      [modalidad],
    );
  }

  private async filas(modalidad: string): Promise<(FilaPredeterminada & { id: string; actualizadoPor: string | null })[]> {
    const filas: any[] = await this.dataSource.query(
      `SELECT id::text AS id, numeral, nombre, etapa, dia_inicio, dia_fin, tipo_dias, dias_antes,
              avisar_a, canal, correos, nota, updated_by
         FROM hiring.cronograma_predeterminado
        WHERE modalidad = $1
        ORDER BY dia_fin, created_at`,
      [modalidad],
    );
    return filas.map((f) => ({
      id: f.id,
      numeral: f.numeral ?? null,
      nombre: f.nombre ?? null,
      etapa: f.etapa === null ? null : Number(f.etapa),
      diaInicio: f.dia_inicio === null ? null : Number(f.dia_inicio),
      diaFin: Number(f.dia_fin),
      tipoDias: f.tipo_dias,
      diasAntes: f.dias_antes === null ? null : Number(f.dias_antes),
      avisarA: f.avisar_a ?? [],
      canal: f.canal,
      correos: f.correos ?? [],
      nota: f.nota ?? null,
      actualizadoPor: f.updated_by ?? null,
    }));
  }
}
