import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampoFormularioEntity } from '../../entities/config/campo-formulario.entity';
import { ConfigTipoComisionadoEntity } from '../../entities/config/config-tipo-comisionado.entity';
import { TipoDocumentoSoporteEntity } from '../../entities/config/tipo-documento-soporte.entity';
import { ConfigTipoComisionadoDocumentoEntity } from '../../entities/config/config-tipo-comisionado-documento.entity';
import {
  CreateCampoFormularioDto,
  UpdateCampoFormularioDto,
} from '../../dto/config/campo-formulario.dto';
import {
  CreateConfigTipoComisionadoDto,
  UpdateConfigTipoComisionadoDto,
} from '../../dto/config/config-tipo-comisionado.dto';
import {
  CreateTipoDocumentoSoporteDto,
  UpdateTipoDocumentoSoporteDto,
} from '../../dto/config/tipo-documento-soporte.dto';

@Injectable()
export class ConfigService {
  constructor(
    @InjectRepository(CampoFormularioEntity)
    private readonly campoRepo: Repository<CampoFormularioEntity>,
    @InjectRepository(ConfigTipoComisionadoEntity)
    private readonly configRepo: Repository<ConfigTipoComisionadoEntity>,
    @InjectRepository(TipoDocumentoSoporteEntity)
    private readonly tipoDocumentoRepo: Repository<TipoDocumentoSoporteEntity>,
    @InjectRepository(ConfigTipoComisionadoDocumentoEntity)
    private readonly configDocumentoRepo: Repository<ConfigTipoComisionadoDocumentoEntity>,
  ) {}

  async obtenerCamposFormulario(): Promise<CampoFormularioEntity[]> {
    const campos = await this.campoRepo.find({
      where: { activo: true },
      order: { grupo: 'ASC', orden: 'ASC' },
    });

    return campos.map((campo) => {
      if (campo.opciones && Array.isArray(campo.opciones)) {
        campo.opciones = (campo.opciones as any[])
          .map((o) => {
            if (typeof o === 'string') return { value: o, label: o };
            if (o && typeof o === 'object' && !Array.isArray(o)) {
              const val = o.value ?? o.valor ?? o.id ?? '';
              const lab = o.label ?? o.nombre ?? o.etiqueta ?? val;
              if (val || lab) return { value: String(val), label: String(lab) };
            }
            return null;
          })
          .filter(Boolean) as Array<{ value: string; label: string }>;
      }
      return campo;
    });
  }

  async obtenerCampoPorClave(
    clave: string,
  ): Promise<CampoFormularioEntity | null> {
    return this.campoRepo.findOne({ where: { clave } });
  }

  async crearCampoFormulario(
    dto: CreateCampoFormularioDto,
  ): Promise<CampoFormularioEntity> {
    const existente = await this.campoRepo.findOne({
      where: { clave: dto.clave },
    });
    if (existente) {
      throw new BadRequestException(
        `Ya existe un campo con la clave ${dto.clave}`,
      );
    }

    const opciones = dto.opciones
      ? dto.opciones
          .map((o) => ({ value: o.value, label: o.label }))
          .filter((o) => o.value && o.label)
      : null;

    const entity = this.campoRepo.create({
      ...dto,
      opciones,
      grupo: dto.grupo ?? null,
    });

    return this.campoRepo.save(entity);
  }

  async actualizarCampoFormulario(
    clave: string,
    dto: UpdateCampoFormularioDto,
  ): Promise<CampoFormularioEntity> {
    const entity = await this.campoRepo.findOne({ where: { clave } });
    if (!entity) {
      throw new NotFoundException(`Campo con clave ${clave} no encontrado`);
    }

    Object.assign(entity, dto);
    if (dto.opciones !== undefined) {
      entity.opciones = dto.opciones
        ? dto.opciones
            .map((o) => ({ value: o.value, label: o.label }))
            .filter((o) => o.value && o.label)
        : null;
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

  async obtenerTodosTiposDocumentoSoporte(
    incluirInactivos: boolean = false,
  ): Promise<TipoDocumentoSoporteEntity[]> {
    const where = incluirInactivos ? {} : { activo: true };
    return this.tipoDocumentoRepo.find({
      where,
      order: { nombre: 'ASC' },
    });
  }

  async obtenerTipoDocumentoSoportePorCodigo(
    codigo: string,
  ): Promise<TipoDocumentoSoporteEntity | null> {
    return this.tipoDocumentoRepo.findOne({ where: { codigo } });
  }

  async crearTipoDocumentoSoporte(
    dto: CreateTipoDocumentoSoporteDto,
  ): Promise<TipoDocumentoSoporteEntity> {
    const normalizado = dto.codigo.trim().toUpperCase();
    const existe = await this.tipoDocumentoRepo.findOne({
      where: { codigo: normalizado },
    });
    if (existe) {
      throw new ConflictException(
        `Ya existe un tipo de documento soporte con el código ${normalizado}`,
      );
    }

    const nuevo = this.tipoDocumentoRepo.create({
      codigo: normalizado,
      nombre: dto.nombre.trim(),
      descripcion: dto.descripcion?.trim() || null,
      instruccionesValidacion: dto.instruccionesValidacion?.trim() || null,
      activo: dto.activo !== undefined ? dto.activo : true,
    });

    return this.tipoDocumentoRepo.save(nuevo);
  }

  async actualizarTipoDocumentoSoporte(
    codigo: string,
    dto: UpdateTipoDocumentoSoporteDto,
  ): Promise<TipoDocumentoSoporteEntity> {
    const entity = await this.tipoDocumentoRepo.findOne({ where: { codigo } });
    if (!entity) {
      throw new NotFoundException(
        `Tipo de documento soporte con código ${codigo} no encontrado`,
      );
    }

    if (dto.nombre !== undefined) {
      entity.nombre = dto.nombre.trim();
    }
    if (dto.descripcion !== undefined) {
      entity.descripcion = dto.descripcion ? dto.descripcion.trim() : null;
    }
    if (dto.instruccionesValidacion !== undefined) {
      entity.instruccionesValidacion = dto.instruccionesValidacion
        ? dto.instruccionesValidacion.trim()
        : null;
    }
    if (dto.activo !== undefined) {
      entity.activo = dto.activo;
    }

    return this.tipoDocumentoRepo.save(entity);
  }

  async eliminarTipoDocumentoSoporte(codigo: string): Promise<void> {
    const entity = await this.tipoDocumentoRepo.findOne({ where: { codigo } });
    if (!entity) {
      throw new NotFoundException(
        `Tipo de documento soporte con código ${codigo} no encontrado`,
      );
    }

    entity.activo = false;
    await this.tipoDocumentoRepo.save(entity);
  }

  async obtenerTodasConfiguraciones(): Promise<ConfigTipoComisionadoEntity[]> {
    return this.configRepo.find({
      where: { activo: true },
      order: { tipoComisionado: 'ASC' },
      relations: ['documentos', 'documentos.tipoDocumentoSoporte'],
    });
  }

  async obtenerConfiguracionPorTipo(
    tipoComisionado: string,
  ): Promise<ConfigTipoComisionadoEntity | null> {
    return this.configRepo.findOne({
      where: { tipoComisionado, activo: true },
      relations: ['documentos', 'documentos.tipoDocumentoSoporte'],
    });
  }

  async obtenerConfiguracionPorCodigoFormulario(
    codigoFormulario: string,
  ): Promise<ConfigTipoComisionadoEntity | null> {
    return this.configRepo.findOne({
      where: { codigoFormulario, activo: true },
      relations: ['documentos', 'documentos.tipoDocumentoSoporte'],
    });
  }

  async obtenerConfiguracionPorDefecto(): Promise<ConfigTipoComisionadoEntity> {
    const defaultConfig = await this.configRepo.findOne({
      where: { tipoComisionado: 'DEFAULT', activo: true },
      relations: ['documentos', 'documentos.tipoDocumentoSoporte'],
    });

    if (defaultConfig) {
      return defaultConfig;
    }

    return this.configRepo.findOne({
      where: { activo: true },
      relations: ['documentos', 'documentos.tipoDocumentoSoporte'],
    }) as Promise<ConfigTipoComisionadoEntity>;
  }

  async crearConfigTipoComisionado(
    dto: CreateConfigTipoComisionadoDto,
  ): Promise<ConfigTipoComisionadoEntity> {
    const existente = await this.configRepo.findOne({
      where: { tipoComisionado: dto.tipoComisionado },
    });
    if (existente) {
      throw new BadRequestException(
        `Ya existe una configuración para el tipo ${dto.tipoComisionado}`,
      );
    }

    const config = this.configRepo.create({
      tipoComisionado: dto.tipoComisionado,
      codigoFormulario: dto.codigoFormulario,
      camposObligatorios: dto.camposObligatorios,
      camposOpcionales: dto.camposOpcionales ?? [],
      camposOcultos: dto.camposOcultos ?? [],
      activo: dto.activo ?? true,
      documentos: [],
    });

    const savedConfig = await this.configRepo.save(config);

    if (dto.documentosObligatorios && dto.documentosObligatorios.length > 0) {
      await this.asignarDocumentosAConfiguracion(
        savedConfig.id,
        dto.documentosObligatorios,
        'OBLIGATORIO',
      );
    }

    if (dto.documentosOpcionales && dto.documentosOpcionales.length > 0) {
      await this.asignarDocumentosAConfiguracion(
        savedConfig.id,
        dto.documentosOpcionales,
        'OPCIONAL',
      );
    }

    return this.obtenerConfiguracionPorTipo(
      savedConfig.tipoComisionado,
    ) as Promise<ConfigTipoComisionadoEntity>;
  }

  async actualizarConfigTipoComisionado(
    tipoComisionado: string,
    dto: UpdateConfigTipoComisionadoDto,
  ): Promise<ConfigTipoComisionadoEntity> {
    const entity = await this.configRepo.findOne({
      where: { tipoComisionado },
    });
    if (!entity) {
      throw new NotFoundException(
        `Configuración para tipo ${tipoComisionado} no encontrada`,
      );
    }

    Object.assign(entity, dto);
    await this.configRepo.save(entity);

    if (
      dto.documentosObligatorios !== undefined ||
      dto.documentosOpcionales !== undefined
    ) {
      await this.configDocumentoRepo.delete({
        configTipoComisionadoId: entity.id,
      });

      if (dto.documentosObligatorios && dto.documentosObligatorios.length > 0) {
        await this.asignarDocumentosAConfiguracion(
          entity.id,
          dto.documentosObligatorios,
          'OBLIGATORIO',
        );
      }

      if (dto.documentosOpcionales && dto.documentosOpcionales.length > 0) {
        await this.asignarDocumentosAConfiguracion(
          entity.id,
          dto.documentosOpcionales,
          'OPCIONAL',
        );
      }
    }

    return this.obtenerConfiguracionPorTipo(
      tipoComisionado,
    ) as Promise<ConfigTipoComisionadoEntity>;
  }

  private async asignarDocumentosAConfiguracion(
    configId: string,
    codigosDocumentos: string[],
    tipoRequisito: 'OBLIGATORIO' | 'OPCIONAL',
  ): Promise<void> {
    for (const codigo of codigosDocumentos) {
      let tipoDoc = await this.tipoDocumentoRepo.findOne({ where: { codigo } });
      if (!tipoDoc) {
        tipoDoc = await this.tipoDocumentoRepo
          .findOne({ where: { id: codigo } })
          .catch(() => null);
      }
      if (!tipoDoc) {
        tipoDoc = this.tipoDocumentoRepo.create({
          codigo,
          nombre: codigo,
          descripcion: null,
          activo: true,
        });
        tipoDoc = await this.tipoDocumentoRepo.save(tipoDoc);
      }

      const existe = await this.configDocumentoRepo.findOne({
        where: {
          configTipoComisionadoId: configId,
          tipoDocumentoSoporteId: tipoDoc.id,
        },
      });

      if (!existe) {
        const rel = this.configDocumentoRepo.create({
          configTipoComisionadoId: configId,
          tipoDocumentoSoporteId: tipoDoc.id,
          tipoRequisito,
        });
        await this.configDocumentoRepo.save(rel);
      }
    }
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
