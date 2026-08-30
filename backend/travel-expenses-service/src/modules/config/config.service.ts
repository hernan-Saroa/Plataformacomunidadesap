import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampoFormularioEntity } from '../../entities/config/campo-formulario.entity';
import { ConfigTipoComisionadoEntity } from '../../entities/config/config-tipo-comisionado.entity';
import { CreateCampoFormularioDto, UpdateCampoFormularioDto } from '../../dto/config/campo-formulario.dto';
import { CreateConfigTipoComisionadoDto, UpdateConfigTipoComisionadoDto } from '../../dto/config/config-tipo-comisionado.dto';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(CampoFormularioEntity)
    private readonly campoRepo: Repository<CampoFormularioEntity>,
    @InjectRepository(ConfigTipoComisionadoEntity)
    private readonly configRepo: Repository<ConfigTipoComisionadoEntity>,
  ) {}

  // ── Campos del formulario ──

  async obtenerCamposFormulario(): Promise<CampoFormularioEntity[]> {
    return this.campoRepo.find({
      where: { activo: true },
      order: { grupo: 'ASC', orden: 'ASC' },
    });
  }

  async obtenerCampoPorClave(clave: string): Promise<CampoFormularioEntity | null> {
    return this.campoRepo.findOne({ where: { clave } });
  }

  async crearCampoFormulario(dto: CreateCampoFormularioDto): Promise<CampoFormularioEntity> {
    const existente = await this.campoRepo.findOne({ where: { clave: dto.clave } });
    if (existente) {
      throw new BadRequestException(`Ya existe un campo con la clave ${dto.clave}`);
    }

    const entity = this.campoRepo.create({
      ...dto,
      opciones: dto.opciones ?? null,
      grupo: dto.grupo ?? null,
    });

    return this.campoRepo.save(entity);
  }

  async actualizarCampoFormulario(clave: string, dto: UpdateCampoFormularioDto): Promise<CampoFormularioEntity> {
    const entity = await this.campoRepo.findOne({ where: { clave } });
    if (!entity) {
      throw new NotFoundException(`Campo con clave ${clave} no encontrado`);
    }

    Object.assign(entity, dto);
    if (dto.opciones !== undefined) {
      entity.opciones = dto.opciones;
    }
    if (dto.grupo !== undefined) {
      entity.grupo = dto.grupo;
    }

    return this.campoRepo.save(entity);
  }

  async eliminarCampoFormulario(clave: string): Promise<void> {
    const entity = await this.campoRepo.findOne({ where: { clave } });
    if (!entity) {
      throw new NotFoundException(`Campo con clave ${clave} no encontrado`);
    }

    entity.activo = false;
    await this.campoRepo.save(entity);
  }

  // ── Configuración por tipo de comisionado ──

  async obtenerTodasConfiguraciones(): Promise<ConfigTipoComisionadoEntity[]> {
    return this.configRepo.find({
      where: { activo: true },
      order: { tipoComisionado: 'ASC' },
    });
  }

  async obtenerConfiguracionPorTipo(tipoComisionado: string): Promise<ConfigTipoComisionadoEntity | null> {
    return this.configRepo.findOne({ where: { tipoComisionado, activo: true } });
  }

  async obtenerConfiguracionPorDefecto(): Promise<ConfigTipoComisionadoEntity> {
    const defaultConfig = await this.configRepo.findOne({
      where: { tipoComisionado: 'DEFAULT', activo: true },
    });

    if (defaultConfig) {
      return defaultConfig;
    }

    return this.configRepo.findOne({ where: { activo: true } }) as Promise<ConfigTipoComisionadoEntity>;
  }

  async crearConfigTipoComisionado(dto: CreateConfigTipoComisionadoDto): Promise<ConfigTipoComisionadoEntity> {
    const existente = await this.configRepo.findOne({ where: { tipoComisionado: dto.tipoComisionado } });
    if (existente) {
      throw new BadRequestException(`Ya existe una configuración para el tipo ${dto.tipoComisionado}`);
    }

    const entity = this.configRepo.create({
      ...dto,
      activo: dto.activo ?? true,
    });

    return this.configRepo.save(entity);
  }

  async actualizarConfigTipoComisionado(
    tipoComisionado: string,
    dto: UpdateConfigTipoComisionadoDto,
  ): Promise<ConfigTipoComisionadoEntity> {
    const entity = await this.configRepo.findOne({ where: { tipoComisionado } });
    if (!entity) {
      throw new NotFoundException(`Configuración para tipo ${tipoComisionado} no encontrada`);
    }

    Object.assign(entity, dto);
    return this.configRepo.save(entity);
  }

  async obtenerResumenParametrizacion(): Promise<{
    totalCampos: number;
    totalTiposConfigurados: number;
    tipos: string[];
  }> {
    const [totalCampos, configs] = await Promise.all([
      this.campoRepo.count({ where: { activo: true } }),
      this.configRepo.find({ where: { activo: true } }),
    ]);

    return {
      totalCampos,
      totalTiposConfigurados: configs.length,
      tipos: configs.map((c) => c.tipoComisionado),
    };
  }
}
