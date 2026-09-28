import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { HiringAccess } from '../../auth/hiring-access';

export type ClaveParametroAlerta =
  | 'anticipacion_amparo'
  | 'anticipacion_cdp'
  | 'anticipacion_rp'
  | 'anticipacion_liquidacion'
  | 'tolerancia_sin_abogado'
  | 'hora_aviso';

export interface ParametroAlerta {
  clave: ClaveParametroAlerta;
  valor: number;
  minimo: number;
  maximo: number;
  descripcion: string;
}

/**
 * Los valores que regían antes de que esto se configurara.
 *
 * Se usan si la tabla todavía no existe —la migración 069 sin aplicar— para que
 * las alertas sigan funcionando igual que antes en vez de caerse.
 */
export const PARAMETROS_POR_DEFECTO: ParametroAlerta[] = [
  { clave: 'anticipacion_amparo', valor: 30, minimo: 1, maximo: 180, descripcion: 'Días antes del vencimiento de una póliza en que se empieza a alertar' },
  { clave: 'anticipacion_cdp', valor: 30, minimo: 1, maximo: 180, descripcion: 'Días antes del cierre de la vigencia de un CDP en que se empieza a alertar' },
  { clave: 'anticipacion_rp', valor: 30, minimo: 1, maximo: 180, descripcion: 'Días antes del cierre de la vigencia de un RP en que se empieza a alertar' },
  { clave: 'anticipacion_liquidacion', valor: 30, minimo: 1, maximo: 180, descripcion: 'Días antes del plazo legal para liquidar en que se empieza a alertar' },
  { clave: 'tolerancia_sin_abogado', valor: 2, minimo: 0, maximo: 30, descripcion: 'Días que un proceso recibido puede estar sin abogado antes de alertar' },
  { clave: 'hora_aviso', valor: 7, minimo: 0, maximo: 23, descripcion: 'Hora de Bogotá a la que sale el aviso diario de vencimientos' },
];

/**
 * Los plazos que gobiernan las alertas (EFDS-1183).
 *
 * Eran constantes en el código: cambiar la anticipación de las pólizas exigía
 * desplegar. Ahora los edita la Dirección, dentro de los límites que la propia
 * fila declara.
 */
@Injectable()
export class ParametrosAlertaService {
  private readonly logger = new Logger(ParametrosAlertaService.name);

  constructor(private readonly dataSource: DataSource) {}

  async listar(): Promise<ParametroAlerta[]> {
    try {
      const filas: ParametroAlerta[] = await this.dataSource.query(
        `SELECT clave, valor, minimo, maximo, descripcion FROM hiring.parametros_alerta`,
      );
      return PARAMETROS_POR_DEFECTO.map((defecto) => {
        const fila = filas.find((f) => f.clave === defecto.clave);
        return fila
          ? { ...fila, valor: Number(fila.valor), minimo: Number(fila.minimo), maximo: Number(fila.maximo) }
          : defecto;
      });
    } catch (error: any) {
      this.logger.warn(`Parámetros de alerta no disponibles, se usan los de siempre: ${error.message}`);
      return PARAMETROS_POR_DEFECTO;
    }
  }

  /** Solo los valores, por clave. */
  async valores(): Promise<Record<ClaveParametroAlerta, number>> {
    const lista = await this.listar();
    return Object.fromEntries(lista.map((p) => [p.clave, p.valor])) as Record<
      ClaveParametroAlerta,
      number
    >;
  }

  async guardar(cambios: Record<string, number>, acceso: HiringAccess): Promise<ParametroAlerta[]> {
    const actuales = await this.listar();

    for (const [clave, valor] of Object.entries(cambios ?? {})) {
      const parametro = actuales.find((p) => p.clave === clave);
      if (!parametro) throw new BadRequestException(`No existe el parámetro ${clave}`);
      if (!Number.isInteger(valor) || valor < parametro.minimo || valor > parametro.maximo) {
        throw new BadRequestException(
          `${parametro.descripcion}: debe ser un número entero entre ${parametro.minimo} y ${parametro.maximo}`,
        );
      }
    }

    await this.dataSource.transaction(async (em) => {
      for (const [clave, valor] of Object.entries(cambios ?? {})) {
        await em.query(
          `UPDATE hiring.parametros_alerta
              SET valor = $1, updated_at = now(), updated_by = $2
            WHERE clave = $3`,
          [valor, acceso.userName ?? null, clave],
        );
      }
    });

    return this.listar();
  }
}
