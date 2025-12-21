import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { StageConfiguration } from '../entities/stage-configuration.entity';
import { DiaFestivo } from '../entities/dia-festivo.entity';

@Injectable()
export class TerminosCalculatorService {
  private festivosCache: DiaFestivo[] | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hora

  constructor(
    @InjectRepository(StageConfiguration)
    private configRepo: Repository<StageConfiguration>,
    @InjectRepository(DiaFestivo)
    private festivosRepo: Repository<DiaFestivo>,
  ) { }

  /**
   * Calcula la fecha de vencimiento según la etapa del proceso
   * Retorna el número de días y la fecha de vencimiento
   */
  async calculateVencimientoEtapa(etapa: string, desde: Date = new Date()): Promise<{
    dias: number;
    fechaVencimiento: Date;
  }> {
    const config = await this.configRepo.findOne({ where: { etapa: etapa } });

    // Default values if not configured
    let dias = 30;
    let esDiasHabiles = true;

    if (config) {
      dias = config.diasHabiles;
      esDiasHabiles = true; // Siempre días hábiles según el nuevo schema
    } else {
      // Fallback defaults using string literals
      switch (etapa) {
        case 'INDAGACIÓN':
        case 'INVESTIGACIÓN':
        case 'INVESTIGACION':
          dias = 180;
          esDiasHabiles = false; // Meses calendario
          break;
        case 'EVALUACION':
        case 'VALORACION':
        case 'VALORACIÓN':
          dias = 10;
          esDiasHabiles = true;
          break;
        case 'JUZGAMIENTO':
          dias = 90;
          esDiasHabiles = true;
          break;
        default:
          dias = 30;
          esDiasHabiles = true;
      }
    }

    if (!esDiasHabiles) {
      // Meses calendario (aproximación simple por ahora)
      const fechaVencimiento = new Date(desde);
      fechaVencimiento.setDate(fechaVencimiento.getDate() + dias);
      return { dias, fechaVencimiento };
    } else {
      const fechaVencimiento = await this.sumarDiasHabiles(desde, dias);
      return { dias, fechaVencimiento };
    }
  }

  /**
   * Calcula la fecha de prescripción (15 años desde la comisión del hecho)
   */
  calculateFechaPrescripcion(fechaHechos: Date): Date {
    const fecha = new Date(fechaHechos);
    fecha.setFullYear(fecha.getFullYear() + 15);
    return fecha;
  }

  /**
   * Obtiene festivos activos desde BD (con caché)
   */
  private async obtenerFestivosActivos(): Promise<DiaFestivo[]> {
    const now = Date.now();

    // Si el caché es válido, retornarlo
    if (this.festivosCache && (now - this.cacheTimestamp) < this.CACHE_DURATION) {
      return this.festivosCache;
    }

    // Obtener de BD
    this.festivosCache = await this.festivosRepo.find({
      where: { activo: true },
    });
    this.cacheTimestamp = now;

    return this.festivosCache;
  }

  /**
   * Suma días hábiles (excluyendo fines de semana y festivos)
   */
  async sumarDiasHabiles(fecha: Date, diasAsumar: number): Promise<Date> {
    const festivos = await this.obtenerFestivosActivos();
    let diasSumados = 0;
    const resultado = new Date(fecha);

    while (diasSumados < diasAsumar) {
      resultado.setDate(resultado.getDate() + 1);

      // Saltar fines de semana
      if (resultado.getDay() === 0 || resultado.getDay() === 6) {
        continue;
      }

      // Saltar festivos
      if (await this.esFestivo(resultado, festivos)) {
        continue;
      }

      diasSumados++;
    }

    return resultado;
  }

  /**
   * Verifica si una fecha es festivo
   */
  private async esFestivo(fecha: Date, festivos?: DiaFestivo[]): Promise<boolean> {
    const festivosList = festivos || await this.obtenerFestivosActivos();

    const fechaStr = fecha.toISOString().split('T')[0]; // YYYY-MM-DD

    return festivosList.some(festivo => {
      const festivoDate = new Date(festivo.fecha);
      const festivoStr = festivoDate.toISOString().split('T')[0];
      return festivoStr === fechaStr;
    });
  }

  /**
   * Calcula los días hábiles restantes hasta una fecha
   */
  async diasHabilesRestantes(fechaVencimiento: Date): Promise<number> {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const fechaVenc = new Date(fechaVencimiento);
    fechaVenc.setHours(0, 0, 0, 0);

    if (fechaVenc < hoy) {
      // Ya vencido, calcular días negativos
      let diasVencidos = 0;
      const temporal = new Date(fechaVenc);
      const festivos = await this.obtenerFestivosActivos();

      while (temporal < hoy) {
        temporal.setDate(temporal.getDate() + 1);

        // Contar solo días hábiles
        if (temporal.getDay() !== 0 && temporal.getDay() !== 6) {
          if (!(await this.esFestivo(temporal, festivos))) {
            diasVencidos++;
          }
        }
      }

      return -diasVencidos; // Negativo indica vencido
    }

    let diasRestantes = 0;
    const temporal = new Date(hoy);
    const festivos = await this.obtenerFestivosActivos();

    while (temporal < fechaVenc) {
      temporal.setDate(temporal.getDate() + 1);

      // Contar solo días hábiles
      if (temporal.getDay() !== 0 && temporal.getDay() !== 6) {
        if (!(await this.esFestivo(temporal, festivos))) {
          diasRestantes++;
        }
      }
    }

    return diasRestantes;
  }

  /**
   * Limpia el caché de festivos (llamar cuando se actualiza un festivo)
   */
  limpiarCacheFestivos(): void {
    this.festivosCache = null;
    this.cacheTimestamp = 0;
  }
}
