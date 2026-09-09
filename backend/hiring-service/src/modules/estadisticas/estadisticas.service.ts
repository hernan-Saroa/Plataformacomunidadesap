import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { EstadoContrato } from '../../entities/contrato.entity';
import { EstadoProceso } from '../../entities/proceso.entity';

/**
 * Los cinco estados que el módulo de Estadísticas y Reportes tiene que informar
 * (EFDS-1189, numeral 3.1.a).
 *
 * No son los mismos diez de `EstadoContrato`: ese es el ciclo interno del
 * trámite y este es el vocabulario con el que la entidad rinde cuentas. Quien
 * pide el reporte no pregunta cuántos contratos están «perfeccionados» y
 * cuántos «legalizados»; pregunta cuántos se suscribieron.
 */
export type EstadoDeGestion =
  | 'SUSCRITO'
  | 'EJECUCION'
  | 'TERMINADO'
  | 'LIQUIDADO'
  | 'CERRADO';

/** En el orden del ciclo, que es como se lee un informe de gestión. */
export const ESTADOS_DE_GESTION: EstadoDeGestion[] = [
  'SUSCRITO',
  'EJECUCION',
  'TERMINADO',
  'LIQUIDADO',
  'CERRADO',
];

/**
 * A qué estado del informe pertenece un contrato, o a ninguno.
 *
 * Devuelve `null` y no un sexto estado para lo que todavía no es un contrato
 * suscrito: una minuta generada o aceptada no obliga a nadie —falta la firma de
 * las dos partes— y una rechazada nunca obligó. Contarlas inflaría el número de
 * contratos de la entidad con papeles que no lo son, que es justo lo que un
 * informe de gestión no puede hacer.
 *
 * `SUSPENDIDO` cuenta como en ejecución por la misma razón que `alMenos` lo
 * trata así: la suspensión es una pausa sobre ese punto del ciclo, no un
 * escalón anterior. Un contrato suspendido está en ejecución, detenido.
 */
export function estadoDeGestion(estado: EstadoContrato): EstadoDeGestion | null {
  switch (estado) {
    case 'PERFECCIONADO':
    case 'LEGALIZADO':
      return 'SUSCRITO';
    case 'EJECUCION':
    case 'SUSPENDIDO':
      return 'EJECUCION';
    case 'TERMINADO':
      return 'TERMINADO';
    case 'LIQUIDADO':
      return 'LIQUIDADO';
    case 'CERRADO':
      return 'CERRADO';
    // GENERADO, ACEPTADO y RECHAZADO: minutas, no contratos.
    default:
      return null;
  }
}

/** Cuántos y por cuánto. Es la forma de todos los cortes del reporte. */
export interface ConteoValor {
  /** Código con el que se agrupó: el estado, la modalidad o la tipología. */
  clave: string;
  /** Cómo se llama en la pantalla y en el archivo descargable. */
  etiqueta: string;
  cuantos: number;
  valor: number;
}

export interface FiltrosEstadisticas {
  /** Año de suscripción. `null` es «toda la contratación». */
  vigencia: number | null;
  /** Código de la modalidad de selección. `null` es «todas». */
  modalidad: string | null;
}

export interface EstadisticasGestion {
  /** Momento del corte: un informe sin fecha no se puede citar. */
  generadoEn: string;
  filtros: FiltrosEstadisticas;
  contratos: {
    total: number;
    valorTotal: number;
    porEstado: ConteoValor[];
    porModalidad: ConteoValor[];
    porTipologia: ConteoValor[];
  };
  procesos: {
    total: number;
    porDesenlace: ConteoValor[];
  };
  presupuesto: {
    /** Suma del valor de los contratos suscritos. */
    contratado: number;
    /** Lo que la Dirección Financiera ya tramitó. */
    pagado: number;
    porPagar: number;
    /** Porcentaje de lo contratado que ya se pagó, con un decimal. */
    porcentajeEjecutado: number;
  };
  /** Los años en que hay contratos, para que la pantalla ofrezca solo esos. */
  vigenciasDisponibles: number[];
}

/** Cómo se lee cada estado del informe. */
const NOMBRE_DEL_ESTADO: Record<EstadoDeGestion, string> = {
  SUSCRITO: 'Suscritos',
  EJECUCION: 'En ejecución',
  TERMINADO: 'Terminados',
  LIQUIDADO: 'Liquidados',
  CERRADO: 'Cerrados',
};

/** Y cada desenlace del proceso de selección. */
const NOMBRE_DEL_DESENLACE: Record<EstadoProceso, string> = {
  EN_CURSO: 'En curso',
  ADJUDICADO: 'Adjudicados',
  DESIERTO: 'Declarados desiertos',
};

/** Una fila cruda del agrupamiento de contratos. */
interface FilaContrato {
  estado: EstadoContrato;
  modalidad: string | null;
  tipologia: string | null;
  cuantos: number;
  valor: number;
}

/**
 * Suma las filas por una de sus columnas y las ordena de mayor a menor.
 *
 * De mayor a menor y no alfabético porque un informe de gestión se lee de
 * arriba: lo primero que se quiere saber es en qué modalidad se contrató más.
 */
function agrupar(
  filas: FilaContrato[],
  clave: (fila: FilaContrato) => string | null,
  etiqueta: (codigo: string) => string,
): ConteoValor[] {
  const acumulado = new Map<string, { cuantos: number; valor: number }>();

  for (const fila of filas) {
    const codigo = clave(fila);
    // Sin clasificar no es una categoría: los procesos anteriores a que la
    // modalidad fuera obligatoria no tienen ninguna, y agruparlos bajo un
    // «(sin modalidad)» inventaría una que el expediente no dice.
    if (!codigo) continue;

    const previo = acumulado.get(codigo) ?? { cuantos: 0, valor: 0 };
    acumulado.set(codigo, {
      cuantos: previo.cuantos + fila.cuantos,
      valor: previo.valor + fila.valor,
    });
  }

  return [...acumulado.entries()]
    .map(([clave, { cuantos, valor }]) => ({ clave, etiqueta: etiqueta(clave), cuantos, valor }))
    .sort((a, b) => b.valor - a.valor || b.cuantos - a.cuantos);
}

/**
 * Estadísticas y reportes de gestión — transversal (EFDS-1189, numeral 3.1.a).
 *
 * No hay tabla de estadísticas y no la habrá: se calculan al consultar, por lo
 * mismo que las alertas de vencimiento (EFDS-1185). Un contador guardado se
 * desincroniza en cuanto un contrato pasa a liquidado, y un informe que no
 * cuadra con el expediente es peor que no tener informe.
 */
@Injectable()
export class EstadisticasService {
  constructor(private readonly dataSource: DataSource) {}

  async gestion(filtros: FiltrosEstadisticas): Promise<EstadisticasGestion> {
    const { vigencia, modalidad } = filtros;

    const [filas, desenlaces, pagado, nombres, vigencias] = await Promise.all([
      this.contratosAgrupados(vigencia, modalidad),
      this.procesosPorDesenlace(vigencia, modalidad),
      this.valorPagado(vigencia, modalidad),
      this.nombresDeCatalogo(),
      this.vigenciasConContratos(),
    ]);

    // El estado del informe se deriva aquí y no en SQL: la equivalencia entre
    // los diez estados del ciclo y los cinco del informe es una regla de
    // negocio con su porqué, y escrita en un CASE del `GROUP BY` no se puede
    // probar sin base de datos.
    const contratos = filas.filter((f) => estadoDeGestion(f.estado) !== null);

    const porEstado = agrupar(
      contratos,
      (f) => estadoDeGestion(f.estado),
      (codigo) => NOMBRE_DEL_ESTADO[codigo as EstadoDeGestion] ?? codigo,
    ).sort(
      // Este corte sí va en el orden del ciclo y no por valor: son las etapas
      // de una misma línea, y ordenarlas por plata las descoloca.
      (a, b) =>
        ESTADOS_DE_GESTION.indexOf(a.clave as EstadoDeGestion) -
        ESTADOS_DE_GESTION.indexOf(b.clave as EstadoDeGestion),
    );

    const total = contratos.reduce((suma, f) => suma + f.cuantos, 0);
    const contratado = contratos.reduce((suma, f) => suma + f.valor, 0);

    return {
      generadoEn: new Date().toISOString(),
      filtros,
      contratos: {
        total,
        valorTotal: contratado,
        porEstado,
        porModalidad: agrupar(
          contratos,
          (f) => f.modalidad,
          (codigo) => nombres.modalidades.get(codigo) ?? codigo,
        ),
        porTipologia: agrupar(
          contratos,
          (f) => f.tipologia,
          (codigo) => nombres.tipologias.get(codigo) ?? codigo,
        ),
      },
      procesos: {
        total: desenlaces.reduce((suma, d) => suma + d.cuantos, 0),
        porDesenlace: desenlaces,
      },
      presupuesto: {
        contratado,
        pagado,
        // Puede dar negativo si se pagó más de lo contratado, y así se informa:
        // taparlo con un `Math.max(0, ...)` escondería justamente el caso que
        // hay que revisar.
        porPagar: contratado - pagado,
        porcentajeEjecutado:
          contratado === 0 ? 0 : Math.round((pagado / contratado) * 1000) / 10,
      },
      vigenciasDisponibles: vigencias,
    };
  }

  /**
   * Los contratos agrupados por estado, modalidad y tipología a la vez.
   *
   * Una sola consulta y no tres: los tres cortes se sacan del mismo conjunto de
   * filas, y pedirlo tres veces obligaría a que los tres coincidieran —si entre
   * una y otra alguien firma un contrato, los totales dejan de cuadrar entre
   * secciones del mismo informe—.
   */
  private async contratosAgrupados(
    vigencia: number | null,
    modalidad: string | null,
  ): Promise<FilaContrato[]> {
    const filas = await this.dataSource.query(
      `
      SELECT c.estado                        AS estado,
             p.modalidad                     AS modalidad,
             c.tipologia                     AS tipologia,
             COUNT(*)::int                   AS cuantos,
             COALESCE(SUM(c.valor), 0)::text AS valor
        FROM hiring.contratos c
        JOIN hiring.procesos  p ON p.id = c.proceso_id
       WHERE ($1::int  IS NULL OR EXTRACT(YEAR FROM c.generado_at) = $1)
         AND ($2::text IS NULL OR p.modalidad = $2)
       GROUP BY c.estado, p.modalidad, c.tipologia
      `,
      [vigencia, modalidad],
    );

    return filas.map((f: any) => ({
      estado: f.estado,
      modalidad: f.modalidad,
      tipologia: f.tipologia,
      cuantos: f.cuantos,
      // `numeric` llega como cadena; sumarlo sin convertir concatena.
      valor: Number(f.valor),
    }));
  }

  /**
   * Cómo terminaron los procesos de selección.
   *
   * Se cuentan aparte de los contratos porque no son lo mismo: un proceso
   * declarado desierto no produjo contrato y aun así es gestión de la entidad
   * —de hecho es el indicador que más se pregunta—.
   */
  private async procesosPorDesenlace(
    vigencia: number | null,
    modalidad: string | null,
  ): Promise<ConteoValor[]> {
    const filas = await this.dataSource.query(
      `
      SELECT p.estado                                 AS estado,
             COUNT(*)::int                            AS cuantos,
             COALESCE(SUM(p.valor_estimado), 0)::text AS valor
        FROM hiring.procesos p
       WHERE ($1::int  IS NULL OR EXTRACT(YEAR FROM p.fecha_radicacion) = $1)
         AND ($2::text IS NULL OR p.modalidad = $2)
       GROUP BY p.estado
      `,
      [vigencia, modalidad],
    );

    return filas
      .map((f: any) => ({
        clave: f.estado,
        etiqueta: NOMBRE_DEL_DESENLACE[f.estado as EstadoProceso] ?? f.estado,
        cuantos: f.cuantos,
        valor: Number(f.valor),
      }))
      .sort((a: ConteoValor, b: ConteoValor) => b.cuantos - a.cuantos);
  }

  /**
   * Lo efectivamente pagado.
   *
   * Solo las cuentas `TRAMITADO`: una cuenta radicada o avalada todavía no es
   * plata que salió, y contarla haría que el informe declarara ejecutado un
   * presupuesto que sigue en la entidad.
   */
  private async valorPagado(
    vigencia: number | null,
    modalidad: string | null,
  ): Promise<number> {
    const [fila] = await this.dataSource.query(
      `
      SELECT COALESCE(SUM(pg.valor), 0)::text AS pagado
        FROM hiring.pagos_contrato pg
        JOIN hiring.contratos c ON c.id = pg.contrato_id
        JOIN hiring.procesos  p ON p.id = c.proceso_id
       WHERE pg.estado = 'TRAMITADO'
         AND ($1::int  IS NULL OR EXTRACT(YEAR FROM c.generado_at) = $1)
         AND ($2::text IS NULL OR p.modalidad = $2)
      `,
      [vigencia, modalidad],
    );

    return Number(fila?.pagado ?? 0);
  }

  /**
   * Cómo se llaman las modalidades y las tipologías.
   *
   * Se traen sin filtrar por activas: un contrato firmado bajo una modalidad
   * que después se retiró del catálogo sigue existiendo, y dejarlo con el
   * código crudo en el informe lo volvería ilegible.
   */
  private async nombresDeCatalogo(): Promise<{
    modalidades: Map<string, string>;
    tipologias: Map<string, string>;
  }> {
    const [modalidades, tipologias] = await Promise.all([
      this.dataSource.query(`SELECT codigo, nombre FROM hiring.modalidades`),
      this.dataSource.query(`SELECT codigo, nombre FROM hiring.tipologias_contrato`),
    ]);

    return {
      modalidades: new Map(modalidades.map((m: any) => [m.codigo, m.nombre])),
      tipologias: new Map(tipologias.map((t: any) => [t.codigo, t.nombre])),
    };
  }

  /** Los años en que se generó algún contrato, del más reciente al más viejo. */
  private async vigenciasConContratos(): Promise<number[]> {
    const filas = await this.dataSource.query(`
      SELECT DISTINCT EXTRACT(YEAR FROM generado_at)::int AS anio
        FROM hiring.contratos
       ORDER BY anio DESC
    `);

    return filas.map((f: any) => f.anio);
  }
}
