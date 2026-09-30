import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CampoFormularioEntity } from '../../entities/config/campo-formulario.entity';
import { ConfigTipoComisionadoEntity } from '../../entities/config/config-tipo-comisionado.entity';
import { TipoDocumentoSoporteEntity } from '../../entities/config/tipo-documento-soporte.entity';
import { ConfigTipoComisionadoDocumentoEntity } from '../../entities/config/config-tipo-comisionado-documento.entity';
import { NotificationClientService } from '../../common/notification-client.service';
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
    @Optional()
    private readonly notificationClient?: NotificationClientService,
  ) {}

  private notificarCambioParametro(params: {
    tipoConfiguracion: string;
    operacion?: string;
    descripcionAjuste: string;
    detalle?: Record<string, any>;
    usuarioModificador?: string;
  }) {
    if (!this.notificationClient) return;
    this.notificationClient
      .notifyTravelExpensesConfigChange(params)
      .catch((err) => {
        // Log silenciado para no romper la transacción
      });
  }

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
    usuarioModificador?: string,
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

    const guardado = await this.campoRepo.save(entity);

    this.notificarCambioParametro({
      tipoConfiguracion: 'Campos del Formulario',
      operacion: 'Creación de Nuevo Campo',
      descripcionAjuste: `Se configuró el nuevo campo "${guardado.etiqueta}" (clave: ${guardado.clave}) con tipo de dato [${guardado.tipoCampo}] para el diligenciamiento de solicitudes.`,
      detalle: {
        clave: guardado.clave,
        etiqueta: guardado.etiqueta,
        tipoCampo: guardado.tipoCampo,
        grupo: guardado.grupo,
      },
      usuarioModificador,
    });

    return guardado;
  }

  async actualizarCampoFormulario(
    clave: string,
    dto: UpdateCampoFormularioDto,
    usuarioModificador?: string,
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

    const guardado = await this.campoRepo.save(entity);

    this.notificarCambioParametro({
      tipoConfiguracion: 'Campos del Formulario',
      operacion: 'Actualización de Campo',
      descripcionAjuste: `Se actualizó la configuración del campo [${clave}] ("${guardado.etiqueta}"). Estado: ${guardado.activo ? 'Activo' : 'Inactivo'}, Tipo: [${guardado.tipoCampo}].`,
      detalle: {
        clave,
        etiqueta: guardado.etiqueta,
        tipoCampo: guardado.tipoCampo,
        activo: guardado.activo,
        orden: guardado.orden,
      },
      usuarioModificador,
    });

    return guardado;
  }

  async eliminarCampoFormulario(
    clave: string,
    usuarioModificador?: string,
  ): Promise<void> {
    const entity = await this.campoRepo.findOne({ where: { clave } });
    if (!entity) {
      throw new NotFoundException(`Campo con clave ${clave} no encontrado`);
    }

    entity.activo = false;
    await this.campoRepo.save(entity);

    this.notificarCambioParametro({
      tipoConfiguracion: 'Campos del Formulario',
      operacion: 'Desactivación de Campo',
      descripcionAjuste: `Se desactivó el campo [${clave}] ("${entity.etiqueta}") del catálogo de captura de viáticos.`,
      detalle: { clave, etiqueta: entity.etiqueta, activo: false },
      usuarioModificador,
    });
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
    usuarioModificador?: string,
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
      camposAValidar: Array.isArray(dto.camposAValidar) ? dto.camposAValidar : [],
      activo: dto.activo !== undefined ? dto.activo : true,
    });

    const guardado = await this.tipoDocumentoRepo.save(nuevo);

    this.notificarCambioParametro({
      tipoConfiguracion: 'Documentos Soporte',
      operacion: 'Nuevo Documento Soporte',
      descripcionAjuste: `Se registró en travel_expenses.tipos_documento_soporte el documento "${guardado.nombre}" (código: ${guardado.codigo})${guardado.instruccionesValidacion ? ' con instrucciones de validación' : ''}.`,
      detalle: {
        codigo: guardado.codigo,
        nombre: guardado.nombre,
        descripcion: guardado.descripcion,
        instruccionesValidacion: guardado.instruccionesValidacion,
        camposAValidar: guardado.camposAValidar,
      },
      usuarioModificador,
    });

    return guardado;
  }

  async actualizarTipoDocumentoSoporte(
    codigo: string,
    dto: UpdateTipoDocumentoSoporteDto,
    usuarioModificador?: string,
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
    if (dto.camposAValidar !== undefined) {
      entity.camposAValidar = Array.isArray(dto.camposAValidar)
        ? dto.camposAValidar
        : [];
    }
    if (dto.activo !== undefined) {
      entity.activo = dto.activo;
    }

    const guardado = await this.tipoDocumentoRepo.save(entity);

    this.notificarCambioParametro({
      tipoConfiguracion: 'Documentos Soporte',
      operacion: 'Actualización de Documento Soporte',
      descripcionAjuste: `Se actualizó el documento soporte [${codigo}] ("${guardado.nombre}"). Estado: ${guardado.activo ? 'Activo' : 'Inactivo'}${dto.instruccionesValidacion !== undefined ? ', con actualización de instrucciones de validación' : ''}.`,
      detalle: {
        codigo,
        nombre: guardado.nombre,
        activo: guardado.activo,
        instruccionesValidacion: guardado.instruccionesValidacion,
        camposAValidar: guardado.camposAValidar,
      },
      usuarioModificador,
    });

    return guardado;
  }

  async eliminarTipoDocumentoSoporte(
    codigo: string,
    usuarioModificador?: string,
  ): Promise<void> {
    const entity = await this.tipoDocumentoRepo.findOne({ where: { codigo } });
    if (!entity) {
      throw new NotFoundException(
        `Tipo de documento soporte con código ${codigo} no encontrado`,
      );
    }

    entity.activo = false;
    await this.tipoDocumentoRepo.save(entity);

    this.notificarCambioParametro({
      tipoConfiguracion: 'Documentos Soporte',
      operacion: 'Desactivación de Documento Soporte',
      descripcionAjuste: `Se desactivó el documento soporte [${codigo}] ("${entity.nombre}").`,
      detalle: { codigo, nombre: entity.nombre, activo: false },
      usuarioModificador,
    });
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
    usuarioModificador?: string,
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

    this.notificarCambioParametro({
      tipoConfiguracion: 'Configuración por Tipo de Comisionado',
      operacion: 'Nueva Configuración por Tipo',
      descripcionAjuste: `Se creó la configuración de formulario y requisitos documentales para el tipo de comisionado [${dto.tipoComisionado}].`,
      detalle: {
        tipoComisionado: dto.tipoComisionado,
        codigoFormulario: dto.codigoFormulario,
        camposObligatorios: dto.camposObligatorios,
        documentosObligatorios: dto.documentosObligatorios,
      },
      usuarioModificador,
    });

    return this.obtenerConfiguracionPorTipo(
      savedConfig.tipoComisionado,
    ) as Promise<ConfigTipoComisionadoEntity>;
  }

  async actualizarConfigTipoComisionado(
    tipoComisionado: string,
    dto: UpdateConfigTipoComisionadoDto,
    usuarioModificador?: string,
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

    this.notificarCambioParametro({
      tipoConfiguracion: 'Configuración por Tipo de Comisionado',
      operacion: 'Actualización de Requisitos por Tipo',
      descripcionAjuste: `Se actualizaron los campos y documentos requeridos para el tipo de comisionado [${tipoComisionado}].`,
      detalle: {
        tipoComisionado,
        codigoFormulario: dto.codigoFormulario ?? entity.codigoFormulario,
        activo: dto.activo ?? entity.activo,
      },
      usuarioModificador,
    });

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
