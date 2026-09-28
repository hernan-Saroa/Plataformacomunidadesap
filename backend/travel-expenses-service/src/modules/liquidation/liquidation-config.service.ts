import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { EscalaViaticoEntity } from '../../entities/liquidation/escala-viatico.entity';
import { TarifaInvestigadorEntity } from '../../entities/liquidation/tarifa-investigador.entity';
import { LiquidationParamEntity } from '../../entities/liquidation/liquidation-param.entity';
import { AuthSystemSettingEntity } from '../../entities/auth-system-setting.entity';
import { TarifaTransporteTerminalEntity } from '../../entities/liquidation/tarifa-transporte-terminal.entity';
import {
  CreateTarifaTransporteTerminalDto,
  UpdateTarifaTransporteTerminalDto,
} from '../../dto/liquidation/tarifa-transporte-terminal.dto';
import { Optional } from '@nestjs/common';
import {
  CreateEscalaViaticoDto,
  UpdateEscalaViaticoDto,
} from '../../dto/liquidation/escala-viatico.dto';
import {
  CreateTarifaInvestigadorDto,
  UpdateTarifaInvestigadorDto,
} from '../../dto/liquidation/tarifa-investigador.dto';
import { UpdateLiquidationParamsDto } from '../../dto/liquidation/liquidation-params.dto';
import { LiquidationService } from './liquidation.service';

@Injectable()
export class LiquidationConfigService {
  constructor(
    @InjectRepository(EscalaViaticoEntity)
    private readonly escalaRepo: Repository<EscalaViaticoEntity>,
    @InjectRepository(TarifaInvestigadorEntity)
    private readonly investigadorRepo: Repository<TarifaInvestigadorEntity>,
    @InjectRepository(TarifaTransporteTerminalEntity)
    private readonly terminalRepo: Repository<TarifaTransporteTerminalEntity>,
    @InjectRepository(LiquidationParamEntity)
    private readonly paramRepo: Repository<LiquidationParamEntity>,
    private readonly dataSource: DataSource,
    private readonly liquidationService: LiquidationService,
    @Optional()
    @InjectRepository(AuthSystemSettingEntity)
    private readonly authSettingRepo?: Repository<AuthSystemSettingEntity>,
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

  async crearEscala(dto: CreateEscalaViaticoDto): Promise<EscalaViaticoEntity> {
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
      where: {
        categoriaInvestigador: dto.categoriaInvestigador.toUpperCase(),
        activo: true,
      },
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
        where: {
          categoriaInvestigador: dto.categoriaInvestigador.toUpperCase(),
          activo: true,
        },
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

  async obtenerCatalogoDepartamentos(): Promise<string[]> {
    return [
      'Amazonas',
      'Antioquia',
      'Arauca',
      'Atlántico',
      'Bolívar',
      'Boyacá',
      'Caldas',
      'Caquetá',
      'Casanare',
      'Cauca',
      'Cesar',
      'Chocó',
      'Córdoba',
      'Cundinamarca',
      'Guainía',
      'Guaviare',
      'Huila',
      'La Guajira',
      'Magdalena',
      'Meta',
      'Nariño',
      'Norte de Santander',
      'Putumayo',
      'Quindío',
      'Risaralda',
      'San Andrés y Providencia',
      'Santander',
      'Sucre',
      'Tolima',
      'Valle del Cauca',
      'Vaupés',
      'Vichada',
    ];
  }

  // ==================== PARÁMETROS GLOBALES ====================

  async obtenerParametros(): Promise<LiquidationParamEntity[]> {
    const list = (
      await this.paramRepo.find({
        order: { clave: 'ASC' },
      })
    ).filter((p) => p.clave !== 'SMMLV_2026');

    let smmlvNum = 1423500;
    if (this.authSettingRepo) {
      try {
        const authSetting = await this.authSettingRepo.findOne({
          where: { key: 'SALARIO_MINIMO_MENSUAL' },
        });
        if (authSetting && authSetting.value) {
          try {
            if (authSetting.value.trim().startsWith('{')) {
              const parsed = JSON.parse(authSetting.value);
              smmlvNum = Number(parsed.salarioMinimo) || 1423500;
            } else {
              smmlvNum = Number(authSetting.value) || 1423500;
            }
          } catch {
            smmlvNum = Number(authSetting.value) || 1423500;
          }
        }
      } catch {
        // En contingencia continúa con valor por defecto
      }
    }

    const smmlvParam = new LiquidationParamEntity();
    smmlvParam.id = 0;
    smmlvParam.clave = 'SMMLV_2026';
    smmlvParam.valor = String(smmlvNum);
    smmlvParam.tipo = 'NUMBER';
    smmlvParam.descripcion =
      'Salario mínimo mensual legal vigente (Catálogo maestro Auth - Solo lectura)';
    smmlvParam.creadoEn = new Date();
    smmlvParam.actualizadoEn = new Date();

    const hasTarifaTerminal = list.some((p) => p.clave === 'TARIFA_TERMINAL_AEREO');
    const extraParams: LiquidationParamEntity[] = [];
    if (!hasTarifaTerminal) {
      const tarifaParam = new LiquidationParamEntity();
      tarifaParam.id = 0;
      tarifaParam.clave = 'TARIFA_TERMINAL_AEREO';
      tarifaParam.valor = '162634';
      tarifaParam.tipo = 'NUMBER';
      tarifaParam.descripcion =
        'Total transporte y desplazamientos terminales aéreos (Resolución de viáticos vigente)';
      tarifaParam.creadoEn = new Date();
      tarifaParam.actualizadoEn = new Date();
      extraParams.push(tarifaParam);
    }

    return [smmlvParam, ...extraParams, ...list];
  }

  async actualizarParametro(
    clave: string,
    valor: string,
  ): Promise<LiquidationParamEntity> {
    if (clave === 'SMMLV_2026') {
      throw new BadRequestException(
        'El parámetro SMMLV_2026 es de solo lectura y debe gestionarse desde Ajustes Generales de Auth.',
      );
    }
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
    const resultados: LiquidationParamEntity[] = [];

    await this.dataSource.transaction(async (manager) => {
      if (params.factorContratista !== undefined) {
        const entity = await manager.findOne(LiquidationParamEntity, {
          where: { clave: 'FACTOR_CONTRATISTA' },
        });
        if (!entity) {
          const nuevo = manager.create(LiquidationParamEntity, {
            clave: 'FACTOR_CONTRATISTA',
            valor: String(params.factorContratista),
            tipo: 'NUMBER',
            descripcion: 'Factor de descuento para contratistas',
          });
          resultados.push(await manager.save(nuevo));
        } else {
          entity.valor = String(params.factorContratista);
          resultados.push(await manager.save(entity));
        }
      }
      if (params.factorSinPernocta !== undefined) {
        const entity = await manager.findOne(LiquidationParamEntity, {
          where: { clave: 'FACTOR_SIN_PERNOCTA' },
        });
        if (!entity) {
          const nuevo = manager.create(LiquidationParamEntity, {
            clave: 'FACTOR_SIN_PERNOCTA',
            valor: String(params.factorSinPernocta),
            tipo: 'NUMBER',
            descripcion: 'Factor aplicado cuando no hay pernocta',
          });
          resultados.push(await manager.save(nuevo));
        } else {
          entity.valor = String(params.factorSinPernocta);
          resultados.push(await manager.save(entity));
        }
      }
      if (params.cacheTtlMinutes !== undefined) {
        const entity = await manager.findOne(LiquidationParamEntity, {
          where: { clave: 'CACHE_TTL_MINUTES' },
        });
        if (!entity) {
          const nuevo = manager.create(LiquidationParamEntity, {
            clave: 'CACHE_TTL_MINUTES',
            valor: String(params.cacheTtlMinutes),
            tipo: 'NUMBER',
            descripcion: 'Tiempo de vida del caché en memoria',
          });
          resultados.push(await manager.save(nuevo));
        } else {
          entity.valor = String(params.cacheTtlMinutes);
          resultados.push(await manager.save(entity));
        }
      }
      if (params.tarifaTerminalAereo !== undefined) {
        const entity = await manager.findOne(LiquidationParamEntity, {
          where: { clave: 'TARIFA_TERMINAL_AEREO' },
        });
        if (!entity) {
          const nuevo = manager.create(LiquidationParamEntity, {
            clave: 'TARIFA_TERMINAL_AEREO',
            valor: String(params.tarifaTerminalAereo),
            tipo: 'NUMBER',
            descripcion:
              'Total transporte y desplazamientos terminales aéreos (Resolución de viáticos vigente)',
          });
          resultados.push(await manager.save(nuevo));
        } else {
          entity.valor = String(params.tarifaTerminalAereo);
          resultados.push(await manager.save(entity));
        }
      }
    });

    await this.liquidationService.recargarParametros();
    return resultados;
  }

  // ==================== TARIFAS TRANSPORTE TERMINALES AÉREOS ====================

  async obtenerTarifasTransporteTerminal(): Promise<TarifaTransporteTerminalEntity[]> {
    return this.terminalRepo.find({
      order: { departamento: 'ASC', ciudad: 'ASC' },
    });
  }

  async obtenerTarifaTransporteTerminalPorId(
    id: number,
  ): Promise<TarifaTransporteTerminalEntity | null> {
    return this.terminalRepo.findOne({ where: { id } });
  }

  async crearTarifaTransporteTerminal(
    dto: CreateTarifaTransporteTerminalDto,
  ): Promise<TarifaTransporteTerminalEntity> {
    const depto = dto.departamento || dto.ciudad || '';
    const ciudadVal = dto.ciudad || dto.departamento || '';
    const existente = await this.terminalRepo.findOne({
      where: [
        { departamento: depto, ciudadAeropuerto: dto.ciudadAeropuerto, activo: true },
        { ciudad: ciudadVal, ciudadAeropuerto: dto.ciudadAeropuerto, activo: true },
      ],
    });
    if (existente) {
      throw new BadRequestException(
        `Ya existe una tarifa activa para ${depto || ciudadVal} y ${dto.ciudadAeropuerto}.`,
      );
    }
    const entity = this.terminalRepo.create({
      ...dto,
      departamento: depto,
      ciudad: ciudadVal,
      activo: dto.activo ?? true,
    });
    const guardada = await this.terminalRepo.save(entity);
    this.liquidationService.invalidarCache();
    return guardada;
  }

  async actualizarTarifaTransporteTerminal(
    id: number,
    dto: UpdateTarifaTransporteTerminalDto,
  ): Promise<TarifaTransporteTerminalEntity> {
    const entity = await this.terminalRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(
        `Tarifa de transporte terminal con id ${id} no encontrada`,
      );
    }
    Object.assign(entity, dto);
    const guardada = await this.terminalRepo.save(entity);
    this.liquidationService.invalidarCache();
    return guardada;
  }

  async eliminarTarifaTransporteTerminal(
    id: number,
  ): Promise<{ message: string }> {
    const entity = await this.terminalRepo.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(
        `Tarifa de transporte terminal con id ${id} no encontrada`,
      );
    }
    await this.terminalRepo.remove(entity);
    this.liquidationService.invalidarCache();
    return {
      message: `Tarifa de transporte terminal con id ${id} eliminada exitosamente`,
    };
  }
}

