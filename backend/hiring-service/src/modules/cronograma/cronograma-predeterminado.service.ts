import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';
import { validarPredeterminado } from './cronograma-predeterminado';
import { GuardarPredeterminadoDto } from './dto/cronograma-predeterminado.dto';

/**
 * Cronograma predeterminado por modalidad (140, sin plazos desde la 144,
 * EFDS-1152).
 *
 * Se configura en Configuración → Cronograma: qué etapas y qué actividades
 * salen por defecto en la 5.2. No lleva fechas ni días; en la 5.2 solo decide
 * qué se muestra de entrada. Nunca escribe en el cronograma de un proceso.
 */
@Injectable()
export class CronogramaPredeterminadoService {
  constructor(private readonly dataSource: DataSource) {}

  /** Cuántas etapas y actividades salen en cada modalidad, para el selector. */
  async resumen() {
    const filas: any[] = await this.dataSource.query(
      `SELECT m.codigo, m.nombre,
              (SELECT count(*) FROM hiring.cronograma_predeterminado_etapas e WHERE e.modalidad = m.codigo)::int AS etapas,
              (SELECT count(*) FROM hiring.cronograma_predeterminado c WHERE c.modalidad = m.codigo)::int AS actividades
         FROM hiring.modalidades m
        WHERE m.activa
        ORDER BY m.orden, m.nombre`,
    );
    return filas.map((f) => ({
      modalidad: f.codigo as string,
      nombre: f.nombre as string,
      etapas: Number(f.etapas),
      actividades: Number(f.actividades),
    }));
  }

  /**
   * El predeterminado de una modalidad: las actividades de las etapas 5 a 10
   * que recorre, cada una con si sale o no, las propias y las etapas que salen.
   */
  async consultar(modalidad: string) {
    const nombre = await this.exigirModalidad(modalidad);
    const catalogo = await this.catalogo(modalidad);
    const { etapas, numerales, propias, actualizadoPor } = await this.leer(modalidad);

    return {
      modalidad,
      nombre,
      etapas,
      actividades: catalogo.map((a) => ({
        numeral: a.numeral,
        nombre: a.nombre,
        etapa: Number(a.etapa),
        incluida: numerales.has(a.numeral),
      })),
      propias,
      actualizadoPor,
    };
  }

  /** Reemplaza el predeterminado entero de la modalidad. */
  async guardar(modalidad: string, dto: GuardarPredeterminadoDto, acceso: HiringAccess) {
    await this.exigirModalidad(modalidad);
    const catalogo = await this.catalogo(modalidad);
    validarPredeterminado(dto, new Map(catalogo.map((a) => [a.numeral, { etapa: Number(a.etapa) }])));
    const quien = acceso.userName ?? null;

    await this.dataSource.transaction(async (em) => {
      await em.query(`DELETE FROM hiring.cronograma_predeterminado_etapas WHERE modalidad = $1`, [modalidad]);
      await em.query(`DELETE FROM hiring.cronograma_predeterminado WHERE modalidad = $1`, [modalidad]);
      for (const etapa of dto.etapas) {
        await em.query(
          `INSERT INTO hiring.cronograma_predeterminado_etapas (modalidad, etapa, updated_by) VALUES ($1, $2, $3)`,
          [modalidad, etapa, quien],
        );
      }
      for (const numeral of dto.numerales) {
        await em.query(
          `INSERT INTO hiring.cronograma_predeterminado (modalidad, numeral, updated_by) VALUES ($1, $2, $3)`,
          [modalidad, numeral, quien],
        );
      }
      for (const p of dto.propias) {
        await em.query(
          `INSERT INTO hiring.cronograma_predeterminado (modalidad, nombre, etapa, updated_by) VALUES ($1, $2, $3, $4)`,
          [modalidad, p.nombre.trim(), p.etapa, quien],
        );
      }
    });

    return this.consultar(modalidad);
  }

  /**
   * Lo que sale por defecto en el cronograma de un proceso, según su
   * modalidad. Lo del flujo que la modalidad ya no recorre se deja fuera: el
   * predeterminado pudo configurarse antes de que la actividad se excluyera.
   */
  async delProceso(procesoId: string) {
    const [proceso] = await this.dataSource.query(
      `SELECT p.modalidad, m.nombre FROM hiring.procesos p
         LEFT JOIN hiring.modalidades m ON m.codigo = p.modalidad
        WHERE p.id = $1`,
      [procesoId],
    );
    if (!proceso) throw new NotFoundException('El proceso no existe o fue eliminado');
    if (!proceso.modalidad) {
      return { modalidad: null, modalidadNombre: null, etapas: [], numerales: [], propias: [] };
    }

    const catalogo = new Set((await this.catalogo(proceso.modalidad)).map((a) => a.numeral));
    const { etapas, numerales, propias } = await this.leer(proceso.modalidad);
    return {
      modalidad: proceso.modalidad as string,
      modalidadNombre: (proceso.nombre as string | null) ?? proceso.modalidad,
      etapas,
      numerales: [...numerales].filter((n) => catalogo.has(n)),
      propias,
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

  private async leer(modalidad: string) {
    const etapas: any[] = await this.dataSource.query(
      `SELECT etapa, updated_by FROM hiring.cronograma_predeterminado_etapas WHERE modalidad = $1 ORDER BY etapa`,
      [modalidad],
    );
    const filas: any[] = await this.dataSource.query(
      `SELECT numeral, nombre, etapa, updated_by
         FROM hiring.cronograma_predeterminado
        WHERE modalidad = $1
        ORDER BY created_at, nombre`,
      [modalidad],
    );
    return {
      etapas: etapas.map((e) => Number(e.etapa)),
      numerales: new Set<string>(filas.filter((f) => f.numeral).map((f) => f.numeral)),
      propias: filas
        .filter((f) => !f.numeral)
        .map((f) => ({ nombre: f.nombre as string, etapa: Number(f.etapa) })),
      actualizadoPor:
        [...etapas, ...filas].map((f) => f.updated_by as string | null).find(Boolean) ?? null,
    };
  }
}
