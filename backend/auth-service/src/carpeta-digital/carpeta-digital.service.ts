import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Person } from '../users/person.entity';
import { CarpetaDigital } from './carpeta-digital.entity';
import { TipoDocumento } from './tipo-documento.entity';

@Injectable()
export class CarpetaDigitalService {
  constructor(
    @InjectRepository(CarpetaDigital)
    private readonly carpetaRepo: Repository<CarpetaDigital>,
    @InjectRepository(TipoDocumento)
    private readonly tipoDocumentoRepo: Repository<TipoDocumento>,
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
  ) {}

  async getAllCarpetas() {
    await this.ensureCarpetasForAllPersons();
    const carpetas = await this.carpetaRepo.find({
      relations: ['persona', 'persona.user', 'persona.seccional', 'persona.sede'],
      order: { createdAt: 'DESC' },
    });

    return carpetas.map((carpeta, index) => this.toCarpetaDto(carpeta, index));
  }

  async getCarpetaByPersona(personaId: string) {
    const carpeta = await this.ensureCarpetaForPersona(personaId);
    const loaded = await this.carpetaRepo.findOne({
      where: { id: carpeta.id },
      relations: ['persona', 'persona.user', 'persona.seccional', 'persona.sede'],
    });
    return this.toCarpetaDto(loaded || carpeta, 0);
  }

  async getChecklistForPersona(personaId: string) {
    const carpeta = await this.ensureCarpetaForPersona(personaId);
    const loaded = await this.carpetaRepo.findOne({
      where: { id: carpeta.id },
      relations: ['persona', 'persona.user', 'persona.seccional', 'persona.sede'],
    });
    const carpetaCompleta = loaded || carpeta;

    const tipos = await this.tipoDocumentoRepo.find({
      where: [
        { carpetaDigitalId: IsNull(), activo: true },
        { carpetaDigitalId: carpetaCompleta.id, activo: true },
      ],
      order: { orden: 'ASC', createdAt: 'ASC' },
    });

    return {
      carpeta: this.toCarpetaDto(carpetaCompleta, 0),
      tiposDocumentos: tipos
        .filter((tipo) => this.tipoAplicaAlaPersona(tipo, carpetaCompleta))
        .map((tipo) => this.toTipoDocumentoDto(tipo)),
    };
  }

  async getTiposDocumentos(carpetaDigitalId?: string) {
    const where = carpetaDigitalId
      ? [{ carpetaDigitalId: IsNull() }, { carpetaDigitalId }]
      : { carpetaDigitalId: IsNull() };

    const tipos = await this.tipoDocumentoRepo.find({
      where,
      order: { orden: 'ASC', createdAt: 'DESC' },
    });
    return tipos.map((tipo) => this.toTipoDocumentoDto(tipo));
  }

  async createTipoDocumento(data: Record<string, any>) {
    const tipo = this.tipoDocumentoRepo.create(this.toTipoDocumentoEntity(data));
    const saved = await this.tipoDocumentoRepo.save(tipo);
    return this.toTipoDocumentoDto(saved);
  }

  async updateTipoDocumento(id: string, data: Record<string, any>) {
    const existing = await this.tipoDocumentoRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Tipo de documento no encontrado');
    const saved = await this.tipoDocumentoRepo.save({
      ...existing,
      ...this.toTipoDocumentoEntity(data),
      id: existing.id,
    });
    return this.toTipoDocumentoDto(saved);
  }

  async deleteTipoDocumento(id: string) {
    const existing = await this.tipoDocumentoRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Tipo de documento no encontrado');
    await this.tipoDocumentoRepo.delete(id);
    return null;
  }

  private async ensureCarpetasForAllPersons() {
    const persons = await this.personRepo.find();
    const existing = await this.carpetaRepo.find({ select: ['personaId'] });
    const existingIds = new Set(existing.map((carpeta) => carpeta.personaId));
    const missing = persons
      .filter((person) => person.id && !existingIds.has(person.id))
      .map((person) => this.carpetaRepo.create({
        personaId: person.id,
        nombreCarpeta: person.full_name || null,
        estado: 'ACTIVO',
      }));

    if (missing.length > 0) {
      await this.carpetaRepo.save(missing);
    }
  }

  private async ensureCarpetaForPersona(personaId: string) {
    const existing = await this.carpetaRepo.findOne({ where: { personaId } });
    if (existing) return existing;

    const person = await this.personRepo.findOne({ where: { id: personaId } });
    if (!person) throw new NotFoundException('Persona no encontrada');
    return this.carpetaRepo.save(this.carpetaRepo.create({
      personaId: person.id,
      nombreCarpeta: person.full_name || null,
      estado: 'ACTIVO',
    }));
  }

  private toCarpetaDto(carpeta: CarpetaDigital, index: number) {
    const persona = carpeta.persona;
    const email = persona?.email || persona?.user?.username || '';
    return {
      id: `carpeta:${carpeta.personaId}`,
      carpeta_digital_id: carpeta.id,
      persona_id: carpeta.personaId,
      nombre_carpeta: carpeta.nombreCarpeta || persona?.full_name || 'Persona sin nombre',
      email_propietario: email,
      numero_documento: persona?.identification_number || '',
      total_documentos: 0,
      documentos_completos: 0,
      documentos_pendientes: 0,
      documentos_rechazados: 0,
      documentos_vencidos: 0,
      ultima_actualizacion: carpeta.updatedAt,
      fecha_creacion: carpeta.createdAt,
      estado: carpeta.estado,
      seccional: persona?.seccional || null,
      sede: persona?.sede || null,
      source_persona: persona || null,
      orden: index + 1,
    };
  }

  private toTipoDocumentoDto(tipo: TipoDocumento) {
    return {
      id: tipo.id,
      carpeta_digital_id: tipo.carpetaDigitalId,
      nombre: tipo.nombre,
      descripcion: tipo.descripcion || '',
      categoria: tipo.categoria,
      icono: tipo.icono,
      color: tipo.color,
      obligatorio: tipo.obligatorio,
      requiere_validacion: tipo.requiereValidacion,
      formatos_permitidos: Array.isArray(tipo.formatosPermitidos) ? tipo.formatosPermitidos : [],
      tamano_max_mb: tipo.tamanoMaxMb,
      activo: tipo.activo,
      es_sistema: tipo.esSistema,
      rol_validador: tipo.rolValidador || '',
      orden: tipo.orden,
      asignacion_tipo: tipo.asignacionTipo,
      asignacion_valor: tipo.asignacionValor || '',
      documentos_asociados: 0,
      created_at: tipo.createdAt,
      updated_at: tipo.updatedAt,
    };
  }

  private toTipoDocumentoEntity(data: Record<string, any>): Partial<TipoDocumento> {
    return {
      carpetaDigitalId: data?.carpeta_digital_id || data?.carpetaDigitalId || null,
      nombre: String(data?.nombre || '').trim(),
      descripcion: data?.descripcion || null,
      categoria: data?.categoria || 'otros',
      icono: data?.icono || 'file-text',
      color: data?.color || '#2962FF',
      obligatorio: Boolean(data?.obligatorio),
      requiereValidacion: data?.requiere_validacion ?? data?.requiereValidacion ?? true,
      formatosPermitidos: Array.isArray(data?.formatos_permitidos)
        ? data.formatos_permitidos
        : ['pdf'],
      tamanoMaxMb: Number(data?.tamano_max_mb || data?.tamanoMaxMb || 10),
      activo: data?.activo ?? true,
      esSistema: data?.es_sistema ?? data?.esSistema ?? false,
      rolValidador: data?.rol_validador || data?.rolValidador || null,
      orden: Number(data?.orden || 0),
      asignacionTipo: data?.asignacion_tipo || data?.asignacionTipo || 'todos',
      asignacionValor: data?.asignacion_valor || data?.asignacionValor || null,
    };
  }

  private tipoAplicaAlaPersona(tipo: TipoDocumento, carpeta: CarpetaDigital): boolean {
    const asignacionTipo = String(tipo.asignacionTipo || 'todos').toLowerCase();
    const asignacionValor = String(tipo.asignacionValor || '').trim().toLowerCase();

    if (asignacionTipo === 'todos' || !asignacionValor) return true;

    const persona = carpeta.persona;
    if (!persona) return false;

    const matches = (...values: unknown[]) => values.some((value) => {
      if (value === null || value === undefined) return false;
      return String(value).trim().toLowerCase() === asignacionValor;
    });

    if (asignacionTipo === 'territorial' || asignacionTipo === 'seccional') {
      return matches(
        persona.idSeccional,
        persona.seccional?.idSeccional,
        persona.seccional?.nomSeccional,
        persona.seccional?.codSeccional,
      );
    }

    if (asignacionTipo === 'sede') {
      return matches(
        persona.idSede,
        persona.sede?.idSede,
        persona.sede?.nomSede,
        persona.sede?.codSede,
      );
    }

    if (asignacionTipo === 'persona') {
      return matches(
        persona.id,
        persona.identification_number,
        persona.email,
      );
    }

    return false;
  }
}
