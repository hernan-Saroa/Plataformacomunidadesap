import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './system-setting.entity';
import { FestivoColombia } from './festivo-colombia.entity';
import {
  CreateFestivoDto,
  UpdateFestivoDto,
} from './dto/ajustes-generales.dto';

const SALARIO_MINIMO_KEY = 'SALARIO_MINIMO_MENSUAL';

export interface SalarioMinimoResponse {
  salarioMinimo: number;
  moneda: string;
  anioVigente: number;
  actualizadoEn: Date;
}

@Injectable()
export class AjustesGeneralesService {
  private readonly logger = new Logger(AjustesGeneralesService.name);

  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
    @InjectRepository(FestivoColombia)
    private readonly festivosRepo: Repository<FestivoColombia>,
  ) {}

  /**
   * Obtiene la configuración actual del Salario Mínimo Legal Vigente (SMMLV)
   */
  async getSalarioMinimo(): Promise<SalarioMinimoResponse> {
    try {
      const setting = await this.settingsRepo.findOne({
        where: { key: SALARIO_MINIMO_KEY },
      });

      const currentYear = new Date().getFullYear();

      if (!setting || !setting.value) {
        return {
          salarioMinimo: 1423500,
          moneda: 'COP',
          anioVigente: currentYear,
          actualizadoEn: new Date(),
        };
      }

      // El valor puede ser numérico simple o JSON con metadatos
      let numericVal = 1423500;
      let anio = currentYear;

      try {
        if (setting.value.trim().startsWith('{')) {
          const parsed = JSON.parse(setting.value);
          numericVal = Number(parsed.salarioMinimo) || 1423500;
          anio = Number(parsed.anio) || currentYear;
        } else {
          numericVal = Number(setting.value) || 1423500;
        }
      } catch {
        numericVal = Number(setting.value) || 1423500;
      }

      return {
        salarioMinimo: numericVal,
        moneda: 'COP',
        anioVigente: anio,
        actualizadoEn: setting.updatedAt || new Date(),
      };
    } catch (error) {
      this.logger.error('Error al consultar salario mínimo:', error);
      return {
        salarioMinimo: 1423500,
        moneda: 'COP',
        anioVigente: new Date().getFullYear(),
        actualizadoEn: new Date(),
      };
    }
  }

  /**
   * Actualiza el Salario Mínimo Legal Vigente (SMMLV)
   */
  async updateSalarioMinimo(
    salarioMinimo: number,
    anio?: number,
  ): Promise<SalarioMinimoResponse> {
    if (!salarioMinimo || salarioMinimo <= 0) {
      throw new BadRequestException('El salario mínimo debe ser mayor a cero');
    }

    const currentYear = anio || new Date().getFullYear();
    const payload = JSON.stringify({
      salarioMinimo,
      anio: currentYear,
      moneda: 'COP',
    });

    let setting = await this.settingsRepo.findOne({
      where: { key: SALARIO_MINIMO_KEY },
    });

    if (setting) {
      setting.value = payload;
      setting.updatedAt = new Date();
    } else {
      setting = this.settingsRepo.create({
        key: SALARIO_MINIMO_KEY,
        value: payload,
        updatedAt: new Date(),
      });
    }

    await this.settingsRepo.save(setting);
    this.logger.log(
      `SMMLV actualizado: $${salarioMinimo.toLocaleString('es-CO')} COP para el año ${currentYear}`,
    );

    return {
      salarioMinimo,
      moneda: 'COP',
      anioVigente: currentYear,
      actualizadoEn: setting.updatedAt,
    };
  }

  /**
   * Lista los días festivos de Colombia, opcionalmente filtrados por año.
   */
  async getFestivos(year?: number): Promise<FestivoColombia[]> {
    const qb = this.festivosRepo.createQueryBuilder('f');

    if (year) {
      const start = `${year}-01-01`;
      const end = `${year}-12-31`;
      qb.where('f.fecha >= :start AND f.fecha <= :end', { start, end });
    }

    return qb.orderBy('f.fecha', 'ASC').getMany();
  }

  /**
   * Sincroniza los festivos oficiales desde la API de calendarios nacionales:
   * https://calendariosnacionales.com/co/v1/{year}/nacionales.json
   *
   * Si no se especifica el año, detecta automáticamente el año actual del sistema.
   */
  async sincronizarFestivos(year?: number): Promise<{
    success: boolean;
    year: number;
    total: number;
    festivos: FestivoColombia[];
    mensaje: string;
  }> {
    const targetYear = year || new Date().getFullYear();
    const apiUrl = `https://calendariosnacionales.com/co/v1/${targetYear}/nacionales.json`;

    this.logger.log(`Iniciando sincronización de festivos desde: ${apiUrl}`);

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new BadRequestException(
          `No se pudo consultar el calendario oficial para el año ${targetYear} (HTTP ${response.status})`,
        );
      }

      const data: any = await response.json();
      const holidays: any[] = data.holidays || [];

      if (!Array.isArray(holidays) || holidays.length === 0) {
        throw new BadRequestException(
          `La API no retornó días festivos para el año ${targetYear}`,
        );
      }

      this.logger.log(
        `Se obtuvieron ${holidays.length} festivos de la API oficial para el año ${targetYear}`,
      );

      // Upsert de cada festivo en la base de datos
      for (const h of holidays) {
        await this.festivosRepo
          .createQueryBuilder()
          .insert()
          .into(FestivoColombia)
          .values({
            fecha: h.date,
            descripcion: h.name,
            origen: h.source || 'Ley 51/1983',
            regla: h.rule || 'fixed',
            actualizadoEn: new Date(),
          })
          .orUpdate(
            ['descripcion', 'origen', 'regla', 'actualizado_en'],
            ['fecha'],
          )
          .execute();
      }

      const festivosActualizados = await this.getFestivos(targetYear);

      return {
        success: true,
        year: targetYear,
        total: festivosActualizados.length,
        festivos: festivosActualizados,
        mensaje: `Se sincronizaron exitosamente ${festivosActualizados.length} días festivos para el año ${targetYear}.`,
      };
    } catch (error: any) {
      this.logger.error(
        `Error al sincronizar festivos del año ${targetYear}:`,
        error,
      );
      throw new BadRequestException(
        error.message || 'Error al conectar con la API de festivos nacionales',
      );
    }
  }

  /**
   * Crea manualmente un día festivo
   */
  async createFestivo(dto: CreateFestivoDto): Promise<FestivoColombia> {
    const existe = await this.festivosRepo.findOne({
      where: { fecha: dto.fecha },
    });

    if (existe) {
      throw new BadRequestException(
        `Ya existe un festivo registrado para la fecha ${dto.fecha}`,
      );
    }

    const festivo = this.festivosRepo.create({
      fecha: dto.fecha,
      descripcion: dto.descripcion,
      origen: dto.origen || 'Manual / Ajuste Interno',
      regla: dto.regla || 'fixed',
    });

    return this.festivosRepo.save(festivo);
  }

  /**
   * Actualiza un día festivo
   */
  async updateFestivo(
    id: number,
    dto: UpdateFestivoDto,
  ): Promise<FestivoColombia> {
    const festivo = await this.festivosRepo.findOne({ where: { id } });
    if (!festivo) {
      throw new NotFoundException(`Festivo con ID ${id} no encontrado`);
    }

    if (dto.fecha && dto.fecha !== festivo.fecha) {
      const existeOtraFecha = await this.festivosRepo.findOne({
        where: { fecha: dto.fecha },
      });
      if (existeOtraFecha && existeOtraFecha.id !== id) {
        throw new BadRequestException(
          `Ya existe otro festivo registrado en la fecha ${dto.fecha}`,
        );
      }
      festivo.fecha = dto.fecha;
    }

    if (dto.descripcion !== undefined) festivo.descripcion = dto.descripcion;
    if (dto.origen !== undefined) festivo.origen = dto.origen;
    if (dto.regla !== undefined) festivo.regla = dto.regla;
    festivo.actualizadoEn = new Date();

    return this.festivosRepo.save(festivo);
  }

  /**
   * Elimina un día festivo
   */
  async deleteFestivo(id: number): Promise<{ success: boolean; id: number }> {
    const festivo = await this.festivosRepo.findOne({ where: { id } });
    if (!festivo) {
      throw new NotFoundException(`Festivo con ID ${id} no encontrado`);
    }

    await this.festivosRepo.delete(id);
    return { success: true, id };
  }
}
