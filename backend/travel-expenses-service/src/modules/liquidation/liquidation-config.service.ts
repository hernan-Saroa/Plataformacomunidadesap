import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EscalaViaticoEntity } from '../../entities/liquidation/escala-viatico.entity';
import { TarifaInvestigadorEntity } from '../../entities/liquidation/tarifa-investigador.entity';
import { TarifaRegionalExcepcionEntity } from '../../entities/liquidation/tarifa-regional-excepcion.entity';
import { LiquidationParamEntity } from '../../entities/liquidation/liquidation-param.entity';
import {
  CreateEscalaViaticoDto,
  UpdateEscalaViaticoDto,
} from '../../dto/liquidation/escala-viatico.dto';
import {
  CreateTarifaInvestigadorDto,
  UpdateTarifaInvestigadorDto,
} from '../../dto/liquidation/tarifa-investigador.dto';
import {
  CreateTarifaRegionalExcepcionDto,
  UpdateTarifaRegionalExcepcionDto,
} from '../../dto/liquidation/tarifa-regional-excepcion.dto';
import { UpdateLiquidationParamsDto } from '../../dto/liquidation/liquidation-params.dto';
import { LiquidationService } from './liquidation.service';

@Injectable()
export class LiquidationConfigService {
  constructor(
    @InjectRepository(EscalaViaticoEntity)
    private readonly escalaRepo: Repository<EscalaViaticoEntity>,
    @InjectRepository(TarifaInvestigadorEntity)
    private readonly investigadorRepo: Repository<TarifaInvestigadorEntity>,
    @InjectRepository(TarifaRegionalExcepcionEntity)
    private readonly regionalRepo: Repository<TarifaRegionalExcepcionEntity>,
    @InjectRepository(LiquidationParamEntity)
    private readonly paramRepo: Repository<LiquidationParamEntity>,
    private readonly dataSource: DataSource,
    private readonly liquidationService: LiquidationService,
  ) {}

  // ==================== ESCALAS ====================

  async obtenerEscalas(): Promise<EscalaViaticoEntity[]> {
    return this.escalaRepo.find({
      where: { activo: true },
      order: { anoVigencia: 'DESC', rangoMinimo: 'ASC' },
    });
  }

  async obtenerEscalaPorId(id: number): Promise<EscalaViaticoEntity | null> {
    return this.escalaRepo.findOne({ where: { id } });
  }

  async crearEscala(
    dto: CreateEscalaViaticoDto,
  ): Promise<EscalaViaticoEntity> {
    const solapada = await this.escalaRepo.findOne({
      where: { anoVigencia: dto.anoVigencia, activo: true },
    });
    if (solapada) {
      throw new BadRequestException(
        `Ya existe una escala activa para el año ${dto.anoVigencia}.`,
      );
    }

    const entity = this.escalaRepo.create({
      ...dto,
      activo: true,
    });
    return this.escalaRepo.save(entity);
  }

  async actualizarEscala(
    id: number,
    dto: UpdateEscalaViaticoDto,
  ): Promise<EscalaViaticoEntity> {
    const entity = await this.escalaRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Escala con id ${id} no encontrada`);
    }

    if (dto.anoVigencia && dto.anoVigencia !== entity.anoVigencia) {
      const existe = await this.escalaRepo.findOne({
        where: { anoVigencia: dto.anoVigencia, activo: true },
      });
      if (existe) {
        throw new BadRequestException(
          `Ya existe una escala activa para el año ${dto.anoVigencia}.`,
        );
      }
    }

    Object.assign(entity, dto);
    return this.escalaRepo.save(entity);
  }

  async eliminarEscala(id: number): Promise<{ message: string }> {
    const entity = await this.escalaRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`Escala con id ${id} no encontrada`);
    }
    entity.activo = false;
    await this.escalaRepo.save(entity);
    return { message: 'Escala eliminada correctamente' };
  }

  // ==================== TARIFAS INVESTIGADOR ====================

  async obtenerTarifasInvestigadores(): Promise<TarifaInvestigadorEntity[]> {
    return this.investigadorRepo.find({
      where: { activo: true },
      order: { categoriaInvestigador: 'ASC' },
    });
  }

  async obtenerTarifaInvestigadorPorId(
    id: number,
  ): Promise<TarifaInvestigadorEntity | null> {
    return this.investigadorRepo.findOne({ where: { id } });
  }

  async crearTarifaInvestigador(
    dto: CreateTarifaInvestigadorDto,
  ): Promise<TarifaInvestigadorEntity> {
    const existente = await this.investigadorRepo.findOne({
      where: { categoriaInvestigador: dto.categoriaInvestigador.toUpperCase(), activo: true },
    });
    if (existente) {
      throw new BadRequestException(
        `Ya existe una tarifa activa para la categoría ${dto.categoriaInvestigador}.`,
      );
    }

    const entity = this.investigadorRepo.create({
      categoriaInvestigador: dto.categoriaInvestigador.toUpperCase(),
      tarifaDiaria: dto.tarifaDiaria,
      activo: true,
    });
    return this.investigadorRepo.save(entity);
  }

  async actualizarTarifaInvestigador(
    id: number,
    dto: UpdateTarifaInvestigadorDto,
  ): Promise<TarifaInvestigadorEntity> {
    const entity = await this.investigadorRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(
        `Tarifa de investigador con id ${id} no encontrada`,
      );
    }

    if (dto.categoriaInvestigador) {
      const existe = await this.investigadorRepo.findOne({
        where: { categoriaInvestigador: dto.categoriaInvestigador.toUpperCase(), activo: true },
      });
      if (existe && existe.id !== id) {
        throw new BadRequestException(
          `Ya existe una tarifa activa para la categoría ${dto.categoriaInvestigador}.`,
        );
      }
      entity.categoriaInvestigador = dto.categoriaInvestigador.toUpperCase();
    }

    if (dto.tarifaDiaria !== undefined) {
      entity.tarifaDiaria = dto.tarifaDiaria;
    }

    return this.investigadorRepo.save(entity);
  }

  async eliminarTarifaInvestigador(id: number): Promise<{ message: string }> {
    const entity = await this.investigadorRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(
        `Tarifa de investigador con id ${id} no encontrada`,
      );
    }
    entity.activo = false;
    await this.investigadorRepo.save(entity);
    return { message: 'Tarifa de investigador eliminada correctamente' };
  }

  // ==================== EXCEPCIONES REGIONALES ====================

  async obtenerExcepcionesRegionales(): Promise<TarifaRegionalExcepcionEntity[]> {
    return this.regionalRepo.find({
      where: { activo: true },
      order: { departamento: 'ASC' },
    });
  }

  async obtenerExcepcionRegionalPorId(
    id: number,
  ): Promise<TarifaRegionalExcepcionEntity | null> {
    return this.regionalRepo.findOne({ where: { id } });
  }

  async crearExcepcionRegional(
    dto: CreateTarifaRegionalExcepcionDto,
  ): Promise<TarifaRegionalExcepcionEntity> {
    const existente = await this.regionalRepo.findOne({
      where: { departamento: dto.departamento, activo: true },
    });
    if (existente) {
      throw new BadRequestException(
        `Ya existe una excepción regional activa para el departamento ${dto.departamento}.`,
      );
    }

    const entity = this.regionalRepo.create({
      ...dto,
      activo: dto.activo ?? true,
    });
    return this.regionalRepo.save(entity);
  }

  async actualizarExcepcionRegional(
    id: number,
    dto: UpdateTarifaRegionalExcepcionDto,
  ): Promise<TarifaRegionalExcepcionEntity> {
    const entity = await this.regionalRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(
        `Excepción regional con id ${id} no encontrada`,
      );
    }

    if (dto.departamento && dto.departamento !== entity.departamento) {
      const existe = await this.regionalRepo.findOne({
        where: { departamento: dto.departamento, activo: true },
      });
      if (existe) {
        throw new BadRequestException(
          `Ya existe una excepción regional activa para el departamento ${dto.departamento}.`,
        );
      }
    }

    Object.assign(entity, dto);
    return this.regionalRepo.save(entity);
  }

  async eliminarExcepcionRegional(id: number): Promise<{ message: string }> {
    const entity = await this.regionalRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(
        `Excepción regional con id ${id} no encontrada`,
      );
    }
    entity.activo = false;
    await this.regionalRepo.save(entity);
    return { message: 'Excepción regional eliminada correctamente' };
  }

  // ==================== PARÁMETROS GLOBALES ====================

  async obtenerParametros(): Promise<LiquidationParamEntity[]> {
    return this.paramRepo.find({
      order: { clave: 'ASC' },
    });
  }

  async actualizarParametro(
    clave: string,
    valor: string,
  ): Promise<LiquidationParamEntity> {
    let entity = await this.paramRepo.findOne({ where: { clave } });
    if (!entity) {
      entity = this.paramRepo.create({
        clave,
        valor,
        tipo: 'STRING',
        descripcion: null,
      });
    } else {
      entity.valor = valor;
    }
    return this.paramRepo.save(entity);
  }

  async actualizarParametrosLote(
    params: UpdateLiquidationParamsDto,
  ): Promise<LiquidationParamEntity[]> {
    const updates: Promise<LiquidationParamEntity>[] = [];
    if (params.smmlv !== undefined) {
      updates.push(this.actualizarParametro('SMMLV_2026', String(params.smmlv)));
    }
    if (params.factorContratista !== undefined) {
      updates.push(this.actualizarParametro('FACTOR_CONTRATISTA', String(params.factorContratista)));
    }
    if (params.factorSinPernocta !== undefined) {
      updates.push(this.actualizarParametro('FACTOR_SIN_PERNOCTA', String(params.factorSinPernocta)));
    }
    if (params.cacheTtlMinutes !== undefined) {
      updates.push(this.actualizarParametro('CACHE_TTL_MINUTES', String(params.cacheTtlMinutes)));
    }

    const resultados = await this.dataSource.transaction(async (manager) => {
      const settled = await Promise.all(updates.map(p => p.catch(err => { throw err; })));
      return settled;
    });

    await this.liquidationService.recargarParametros();
    return resultados;
  }
}
