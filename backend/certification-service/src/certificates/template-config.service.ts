import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { existsSync, statSync } from 'fs';
import { join } from 'path';
import { TemplateConfig } from './template-config.entity';
import { TemplateConfigChange } from './template-config-change.entity';
import { Firmante } from './firmante.entity';

@Injectable()
export class TemplateConfigService {
  private readonly defaultLogoUrl = '/uploads/logos/logo-esap-default.png';
  private readonly defaultLogoFilename = 'logo-esap-default.png';
  private readonly defaultLogoPath = join(
    __dirname,
    '..',
    '..',
    'uploads',
    'logos',
    this.defaultLogoFilename,
  );

  constructor(
    @InjectRepository(TemplateConfig)
    private templateConfigRepository: Repository<TemplateConfig>,
    @InjectRepository(TemplateConfigChange)
    private changeRepository: Repository<TemplateConfigChange>,
    @InjectRepository(Firmante)
    private firmanteRepository: Repository<Firmante>,
  ) {}

  // Evita que las variables lleguen en negrita por defecto; el usuario decide el estilo
  private stripVariableBold(content: string): string {
    if (!content) return content;
    return content.replace(/<(b|strong)>\s*(\[[^\]]+\])\s*<\/\1>/gi, '$2');
  }

  private getDefaultCargoTitle(_templateType: string): string {
    return 'LA DIRECTORA T\u00C9CNICA DE TALENTO HUMANO DE LA\nESCUELA SUPERIOR DE ADMINISTRACI\u00D3N P\u00DABLICA - ESAP';
  }

  private getDefaultContent(templateType: string): string {
    if (templateType === 'administrador') {
      return 'Que [NOMBRE_EMPLEADO] identificado con c\u00E9dula de ciudadan\u00EDa No. [DOCUMENTO], se encuentra vinculado con la Escuela Superior de Administraci\u00F3n P\u00FAblica - ESAP mediante nombramiento [CARGO] desde el [FECHA_INICIO], desempe\u00F1ando el cargo de [DEPENDENCIA] [DATO6] ubicado en [DATO7].<br><br><div>Que el se\u00F1or [NOMBRE_EMPLEADO] percibe mensualmente una asignaci\u00F3n salarial de [SALARIO] [SALARIO_LETRAS] pesos m/cte.<br><br></div><div>Se expide en la ciudad de Bogot\u00E1 D.C., a solicitud del interesado(a) a los [FECHA_EXPEDICION_COMPLETA].</div>';
    }
    return '<p>Que<b>&nbsp;</b>[NOMBRE_EMPLEADO] identificado(a) con c\u00E9dula de ciudadan\u00EDa No. [DOCUMENTO], se encuentra vinculado(a) con la Escuela Superior de Administraci\u00F3n P\u00FAblica \u2013 ESAP, mediante nombramiento Docente [CARGO] desde el [FECHA_INICIO], en la categor\u00EDa [DEPENDENCIA] ubicado en [DATO6].</p><p>Que [NOMBRE_EMPLEADO] percibe mensualmente una asignaci\u00F3n salarial de [SALARIO] [SALARIO_LETRAS] pesos m/cte.</p><p>Se expide en la ciudad de Bogot\u00E1 D.C., a solicitud del interesado(a) a los&nbsp;[FECHA_EXPEDICION_COMPLETA].</p>';
  }

  private async getOrCreateConfig(templateType: string): Promise<TemplateConfig> {
    let config = await this.templateConfigRepository.findOne({
      where: { isActive: true, templateType },
      relations: ['firmante'],
    });

    if (!config) {
      config = await this.createDefaultConfig(templateType);
    }
    return config;
  }

  /**
   * Obtiene la configuración activa de la plantilla
   * Incluye los datos del firmante principal
   */
  async getActiveConfig(templateType = 'docente'): Promise<any> {
    const config = await this.getOrCreateConfig(templateType);

    // Si no tiene firmante asignado, buscar el firmante principal
    let firmante = config.firmante;
    if (!firmante) {
      const firmantePrincipal = await this.firmanteRepository.findOne({
        where: { es_principal: true, activo: true },
      });
      if (firmantePrincipal) {
        firmante = firmantePrincipal;
      }
    }

    return {
      id: config.id,
      version: config.version,
      status: config.status,
      firmante: firmante
        ? {
            id: firmante.id,
            nombreCompleto: config.signerNameOverride || firmante.nombre_completo,
            cargo: firmante.cargo,
            dependencia: firmante.dependencia,
            firmaDigitalUrl: config.signatureUrl || firmante.firma_digital_url,
          }
        : null,
      logo: await this.ensureLogoInfo(config),
      typography: {
        font: config.typographyFont || 'Times New Roman',
      },
      cargoTitle: config.cargoTitle || this.getDefaultCargoTitle(templateType),
      certificateContentHtml: this.stripVariableBold(
        config.certificateContentHtml || this.getDefaultContent(templateType),
      ),
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
      templateType: config.templateType,
    };
  }

  /**
   * Actualiza el nombre del firmante
   * (Actualiza directamente el registro del firmante en la tabla firmantes)
   */
  async updateSignerName(signerName: string, updatedBy: string, templateType = 'docente'): Promise<any> {
    const config = await this.getOrCreateConfig(templateType);

    const oldValue = config.signerNameOverride || config.firmante?.nombre_completo || '';

    config.signerNameOverride = signerName;
    config.updatedBy = updatedBy;
    await this.templateConfigRepository.save(config);

    await this.recordChange({
      templateConfigId: config.id,
      changeType: 'nombre',
      fieldName: 'signer_name_override',
      oldValue: oldValue,
      newValue: signerName,
      changedBy: updatedBy,
    });

    return this.getActiveConfig(config.templateType);
  }

  /**
   * Restablece el nombre del firmante al valor predeterminado
   */
  async resetSignerName(updatedBy: string, templateType = 'docente'): Promise<any> {
    const config = await this.getOrCreateConfig(templateType);

    let firmante = config.firmante;
    if (!firmante) {
      const firmantePrincipal = await this.firmanteRepository.findOne({
        where: { es_principal: true, activo: true },
      });
      if (firmantePrincipal) {
        firmante = firmantePrincipal;
      }
    }

    const defaultName = firmante?.nombre_completo || '';
    const oldValue = config.signerNameOverride || defaultName;

    config.signerNameOverride = null;
    config.updatedBy = updatedBy;
    await this.templateConfigRepository.save(config);

    await this.recordChange({
      templateConfigId: config.id,
      changeType: 'nombre',
      fieldName: 'signer_name_override',
      oldValue: oldValue,
      newValue: defaultName,
      changedBy: updatedBy,
    });

    return this.getActiveConfig(config.templateType);
  }

  /**
   * Actualiza el logo de la entidad
   */
  async updateLogo(
    logoUrl: string,
    filename: string,
    size: string,
    updatedBy: string,
    templateType = 'docente',
  ): Promise<any> {
    const config = await this.getOrCreateConfig(templateType);

    // Guardar valores anteriores para el historial
    const oldLogoUrl = config.entityLogoUrl;
    const oldFilename = config.entityLogoFilename;

    config.entityLogoUrl = logoUrl;
    config.entityLogoFilename = filename;
    config.entityLogoSize = size;
    config.updatedBy = updatedBy;

    await this.templateConfigRepository.save(config);

    // Registrar cambio en el historial
    await this.recordChange({
      templateConfigId: config.id,
      changeType: 'logo',
      fieldName: 'entity_logo_url',
      oldValue: oldLogoUrl || 'Sin logo',
      newValue: logoUrl,
      changedBy: updatedBy,
      metadata: {
        filename: filename,
        size: size,
        oldFilename: oldFilename,
      },
    });

    return this.getActiveConfig(config.templateType);
  }

  /**
   * Restaura el logo al predeterminado de ESAP
   */
  async resetLogo(updatedBy: string, templateType = 'docente'): Promise<any> {
    const config = await this.getOrCreateConfig(templateType);

    const defaultLogo = this.getDefaultLogoInfo();
    const oldLogoUrl = config.entityLogoUrl || 'Sin logo';

    config.entityLogoUrl = defaultLogo.url;
    config.entityLogoFilename = defaultLogo.filename;
    config.entityLogoSize = defaultLogo.size;
    config.updatedBy = updatedBy;

    await this.templateConfigRepository.save(config);

    await this.recordChange({
      templateConfigId: config.id,
      changeType: 'logo',
      fieldName: 'entity_logo_url',
      oldValue: oldLogoUrl,
      newValue: defaultLogo.url,
      changedBy: updatedBy,
      metadata: {
        filename: defaultLogo.filename,
        size: defaultLogo.size,
      },
    });

    return this.getActiveConfig(config.templateType);
  }

  /**
   * Actualiza la firma del firmante
   */
  async updateSignature(
    signatureUrl: string,
    updatedBy: string,
    templateType = 'docente',
    fileMeta?: { filename?: string; size?: string },
  ): Promise<any> {
    const config = await this.getOrCreateConfig(templateType);

    let firmante = config.firmante;
    if (!firmante) {
      const firmantePrincipal = await this.firmanteRepository.findOne({
        where: { es_principal: true, activo: true },
      });
      if (!firmantePrincipal) {
        throw new NotFoundException('No se encontró firmante principal');
      }
      firmante = firmantePrincipal;
    }

    const oldSignatureUrl = config.signatureUrl || firmante.firma_digital_url || 'Sin firma';

    // Guardar la firma en la configuración (aislada por tipo)
    config.signatureUrl = signatureUrl;
    config.signatureFilename = fileMeta?.filename || null;
    config.signatureSize = fileMeta?.size || null;
    config.updatedBy = updatedBy;
    await this.templateConfigRepository.save(config);

    // Registrar cambio en el historial
    await this.recordChange({
      templateConfigId: config.id,
      changeType: 'firma',
      fieldName: 'signature_url',
      oldValue: oldSignatureUrl || 'Sin firma',
      newValue: signatureUrl,
      changedBy: updatedBy,
      metadata: {
        filename: fileMeta?.filename || null,
        size: fileMeta?.size || null,
      },
    });

    return this.getActiveConfig(config.templateType);
  }

  /**
   * Elimina la firma y deja la configuración en blanco
   */
  async clearSignature(updatedBy: string, templateType = 'docente'): Promise<any> {
    const config = await this.getOrCreateConfig(templateType);

    const oldSignatureUrl = config.signatureUrl || 'Sin firma';

    config.signatureUrl = '';
    config.signatureFilename = null;
    config.signatureSize = null;
    config.updatedBy = updatedBy;
    await this.templateConfigRepository.save(config);

    await this.recordChange({
      templateConfigId: config.id,
      changeType: 'firma',
      fieldName: 'signature_url',
      oldValue: oldSignatureUrl,
      newValue: 'Sin firma',
      changedBy: updatedBy,
    });

    return this.getActiveConfig(config.templateType);
  }

  /**
   * Obtiene el historial de cambios de la configuración activa
   */
  async getChangeHistory(
    templateType = 'docente',
    limit?: number,
    offset?: number,
  ): Promise<any[] | { items: any[]; total: number; limit: number; offset: number }> {
    const config = await this.getOrCreateConfig(templateType);

    const mapChange = (change: TemplateConfigChange) => ({
      id: change.id,
      changeType: change.changeType,
      fieldName: change.fieldName,
      oldValue: change.oldValue,
      newValue: change.newValue,
      changedAt: change.changedAt,
      changedBy: change.changedBy,
      metadata: change.metadata,
    });

    if (typeof limit === 'number') {
      const safeLimit = Math.max(1, limit);
      const safeOffset = Math.max(0, offset || 0);
      const [changes, total] = await this.changeRepository.findAndCount({
        where: { templateConfigId: config.id },
        order: { changedAt: 'DESC' },
        take: safeLimit,
        skip: safeOffset,
      });
      return {
        items: changes.map(mapChange),
        total,
        limit: safeLimit,
        offset: safeOffset,
      };
    }

    const changes = await this.changeRepository.find({
      where: { templateConfigId: config.id },
      order: { changedAt: 'DESC' },
    });

    return changes.map(mapChange);
  }

  /**
   * Registra un cambio en el historial
   */
  private async recordChange(params: {
    templateConfigId: number;
    changeType: string;
    fieldName: string;
    oldValue: string;
    newValue: string;
    changedBy: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const change = new TemplateConfigChange();
    change.templateConfigId = params.templateConfigId;
    change.changeType = params.changeType;
    change.fieldName = params.fieldName;
    change.oldValue = params.oldValue;
    change.newValue = params.newValue;
    change.changedBy = params.changedBy;
    if (params.metadata) {
      change.metadata = params.metadata;
    }

    await this.changeRepository.save(change);
  }

  /**
   * Actualiza el contenido de la plantilla (tipografía, título del cargo, contenido HTML)
   */
  async updateTemplateContent(
    data: {
      typographyFont?: string;
      cargoTitle?: string;
      certificateContentHtml?: string;
    },
    updatedBy: string,
    templateType = 'docente',
  ): Promise<any> {
    const config = await this.getOrCreateConfig(templateType);

    const changes: Array<{
      changeType: string;
      fieldName: string;
      oldValue: string;
      newValue: string;
      metadata?: any;
    }> = [];

    // Actualizar tipografía si cambió
    if (data.typographyFont && data.typographyFont !== config.typographyFont) {
      changes.push({
        changeType: 'tipografia',
        fieldName: 'typography_font',
        oldValue: config.typographyFont || 'Times New Roman',
        newValue: data.typographyFont,
      });
      config.typographyFont = data.typographyFont;
    }

    // Actualizar título del cargo si cambió
    if (data.cargoTitle && data.cargoTitle !== config.cargoTitle) {
      changes.push({
        changeType: 'titulo_cargo',
        fieldName: 'cargo_title',
        oldValue: config.cargoTitle || '',
        newValue: data.cargoTitle,
      });
      config.cargoTitle = data.cargoTitle;
    }

    // Actualizar contenido HTML si cambió
    if (data.certificateContentHtml && data.certificateContentHtml !== config.certificateContentHtml) {
      changes.push({
        changeType: 'contenido',
        fieldName: 'certificate_content_html',
        oldValue: config.certificateContentHtml || '',
        newValue: data.certificateContentHtml,
      });
      config.certificateContentHtml = data.certificateContentHtml;
    }

    // Actualizar configuración
    config.updatedBy = updatedBy;
    await this.templateConfigRepository.save(config);

    // Registrar todos los cambios en el historial
    for (const change of changes) {
      await this.recordChange({
        templateConfigId: config.id,
        changeType: change.changeType,
        fieldName: change.fieldName,
        oldValue: change.oldValue,
        newValue: change.newValue,
        changedBy: updatedBy,
        metadata: change.metadata,
      });
    }

    return this.getActiveConfig(config.templateType);
  }
  /**
   * Restablece el titulo del cargo al predeterminado
   */
  async resetCargoTitle(updatedBy: string, templateType = 'docente'): Promise<any> {
    const config = await this.getOrCreateConfig(templateType);
    const defaultTitle = this.getDefaultCargoTitle(templateType);
    const oldValue = config.cargoTitle || '';

    config.cargoTitle = defaultTitle;
    config.updatedBy = updatedBy;
    await this.templateConfigRepository.save(config);

    await this.recordChange({
      templateConfigId: config.id,
      changeType: 'titulo_cargo',
      fieldName: 'cargo_title',
      oldValue: oldValue,
      newValue: defaultTitle,
      changedBy: updatedBy,
    });

    return this.getActiveConfig(config.templateType);
  }

  /**
   * Restablece el contenido del certificado al predeterminado
   */
  async resetCertificateContent(updatedBy: string, templateType = 'docente'): Promise<any> {
    const config = await this.getOrCreateConfig(templateType);
    const defaultContent = this.getDefaultContent(templateType);
    const oldValue = config.certificateContentHtml || '';

    config.certificateContentHtml = defaultContent;
    config.updatedBy = updatedBy;
    await this.templateConfigRepository.save(config);

    await this.recordChange({
      templateConfigId: config.id,
      changeType: 'contenido',
      fieldName: 'certificate_content_html',
      oldValue: oldValue,
      newValue: defaultContent,
      changedBy: updatedBy,
    });

    return this.getActiveConfig(config.templateType);
  }
  /**
   * Crea una configuración por defecto
   */
  private async createDefaultConfig(templateType: string): Promise<TemplateConfig> {
    const defaultLogo = this.getDefaultLogoInfo();
    const firmantePrincipal = await this.firmanteRepository.findOne({
      where: { es_principal: true, activo: true },
    });

    const config = this.templateConfigRepository.create({
      firmanteId: firmantePrincipal?.id || undefined,
      version: '1.0.0',
      status: 'draft',
      createdBy: 'Sistema',
      updatedBy: 'Sistema',
      isActive: true,
      entityLogoUrl: defaultLogo.url,
      entityLogoFilename: defaultLogo.filename,
      entityLogoSize: defaultLogo.size,
      templateType,
      certificateContentHtml: this.getDefaultContent(templateType),
      cargoTitle: this.getDefaultCargoTitle(templateType),
    });

    return await this.templateConfigRepository.save(config);
  }

  /**
   * Devuelve el logo predeterminado y asegura que exista la metadata básica
   */
  private getDefaultLogoInfo(): { url: string; filename: string; size: string } {
    let size = 'N/D';
    if (existsSync(this.defaultLogoPath)) {
      const stats = statSync(this.defaultLogoPath);
      size = `${Math.max(1, Math.round(stats.size / 1024))} KB`;
    }

    return {
      url: this.defaultLogoUrl,
      filename: this.defaultLogoFilename,
      size,
    };
  }

  /**
   * Garantiza que siempre haya información de logo (usa el predeterminado si falta)
   */
  private async ensureLogoInfo(
    config: TemplateConfig,
  ): Promise<{ url: string; filename: string; size: string }> {
    if (config.entityLogoUrl) {
      return {
        url: config.entityLogoUrl,
        filename: config.entityLogoFilename,
        size: config.entityLogoSize,
      };
    }

    const defaultLogo = this.getDefaultLogoInfo();
    config.entityLogoUrl = defaultLogo.url;
    config.entityLogoFilename = defaultLogo.filename;
    config.entityLogoSize = defaultLogo.size;
    await this.templateConfigRepository.save(config);

    return defaultLogo;
  }
}

