import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessStage } from '../entities/disciplinary-process.entity';
import { StageConfiguration } from '../entities/stage-configuration.entity';

@Injectable()
export class TerminosCalculatorService {
  constructor(
    @InjectRepository(StageConfiguration)
    private configRepo: Repository<StageConfiguration>,
  ) { }

  /**
   * Días festivos en Colombia (mock para este ejemplo)
   */
  private readonly festivosColombia = [
    '01-01', // Año Nuevo
    '01-08', // Reyes
    '03-25', // San José
    '05-01', // Trabajo
    '06-10', // Corpus Christi
    '06-17', // Sagrado Corazón
    '07-01', // San Pedro y Pablo
    '07-20', // Independencia
    '08-07', // Batalla de Boyacá
    '08-15', // Asunción
    '11-01', // Todos los Santos
    '11-11', // Independencia de Cartagena
    '12-08', // Inmaculada Concepción
    '12-25', // Navidad
  ];

  /**
   * Calcula la fecha de vencimiento según la etapa del proceso
   * Retorna el número de días y la fecha de vencimiento
   */
  async calculateVencimientoEtapa(etapa: ProcessStage, desde: Date = new Date()): Promise<{
    dias: number;
    fechaVencimiento: Date;
  }> {
    const config = await this.configRepo.findOne({ where: { etapa: etapa } });

    // Default values if not configured
    let dias = 30;
    let esDiasHabiles = true;

    if (config) {
      // console.log(`DEBUG: Usando configuración de DB para ${etapa}: ${config.diasHabiles} días`);
      dias = config.diasHabiles;
      esDiasHabiles = true; // Siempre días hábiles según el nuevo schema
    } else {
      // console.log(`DEBUG: Usando fallback para ${etapa}`);
      // Fallback defaults
      switch (etapa) {
        case ProcessStage.INDAGACION_PREVIA:
        case ProcessStage.INVESTIGACION:
          dias = 180;
          esDiasHabiles = false; // Meses calendario
          break;
        case ProcessStage.JUZGAMIENTO:
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
      const fechaVencimiento = this.sumarDiasHabiles(desde, dias);
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
   * Suma días hábiles (excluyendo fines de semana y festivos)
   */
  private sumarDiasHabiles(fecha: Date, diasAsumar: number): Date {
    let diasSumados = 0;
    const resultado = new Date(fecha);

    while (diasSumados < diasAsumar) {
      resultado.setDate(resultado.getDate() + 1);

      // Saltar fines de semana
      if (resultado.getDay() === 0 || resultado.getDay() === 6) {
        continue;
      }

      // Saltar festivos
      if (this.esFestivo(resultado)) {
        continue;
      }

      diasSumados++;
    }

    return resultado;
  }

  /**
   * Verifica si una fecha es festivo en Colombia
   */
  private esFestivo(fecha: Date): boolean {
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const fechaStr = `${mes}-${dia}`;

    return this.festivosColombia.includes(fechaStr);
  }

  /**
   * Calcula los días hábiles restantes hasta una fecha
   */
  diasHabilesRestantes(fechaVencimiento: Date): number {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (fechaVencimiento < hoy) {
      return 0; // Ya vencido
    }

    let diasRestantes = 0;
    const temporal = new Date(hoy);

    while (temporal < fechaVencimiento) {
      temporal.setDate(temporal.getDate() + 1);

      // Contar solo días hábiles
      if (temporal.getDay() !== 0 && temporal.getDay() !== 6) {
        if (!this.esFestivo(temporal)) {
          diasRestantes++;
        }
      }
    }

    return diasRestantes;
  }
}
