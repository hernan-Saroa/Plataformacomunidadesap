import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, IsNull, Repository } from 'typeorm';
import { Person } from '../users/person.entity';
import { CarpetaDigital } from './carpeta-digital.entity';
import { TipoDocumento } from './tipo-documento.entity';
import { DocumentoCarpetaDigital } from './documento-carpeta-digital.entity';

@Injectable()
export class CarpetaDigitalService {
  constructor(
    @InjectRepository(CarpetaDigital)
    private readonly carpetaRepo: Repository<CarpetaDigital>,
    @InjectRepository(TipoDocumento)
    private readonly tipoDocumentoRepo: Repository<TipoDocumento>,
    @InjectRepository(Person)
    private readonly personRepo: Repository<Person>,
    @InjectRepository(DocumentoCarpetaDigital)
    private readonly documentoRepo: Repository<DocumentoCarpetaDigital>,
    private readonly dataSource: DataSource,
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

  /** Busca un tipo de documento por id (para validación de contenido en upload). */
  async findTipoDocumentoById(id: string): Promise<TipoDocumento | null> {
    if (!id) return null;
    return (await this.tipoDocumentoRepo.findOne({ where: { id } })) || null;
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

  // ═══════════════════════════════════════════════════════════════════
  // DOCUMENTOS (Fase 2 — persistencia real)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Lista los documentos de la carpeta de una persona. UNIÓN de:
   *  1) auth.documento_carpeta_digital (uploads genéricos + soportes RUND sincronizados)
   *  2) academic_work_plan."RundSoporteCampo" (soportes RUND que aún no estén sincronizados)
   *
   * Acepta personaId puro o el formato "carpeta:<personaId>" (legado del frontend).
   */
  async listDocumentosByPersona(personaIdOrCarpetaId: string) {
    const personaId = String(personaIdOrCarpetaId || '').replace(/^carpeta:/, '').trim();
    if (!personaId) return [];

    const carpeta = await this.ensureCarpetaForPersona(personaId);

    // 1) Documentos persistidos en auth
    const docs = await this.documentoRepo.find({
      where: { carpetaDigitalId: carpeta.id },
      relations: ['tipoDocumento'],
      order: { fechaSubida: 'DESC' },
    });

    const docsDto: any[] = docs.map((d) => this.toDocumentoDto(d, carpeta.personaId));
    const seenRundSoporteIds = new Set(docs.filter((d) => d.rundSoporteId).map((d) => d.rundSoporteId));

    // 2) Soportes RUND cross-schema (los que aún no tienen su fila en auth.documento_carpeta_digital)
    let rundSoportes: any[] = [];
    try {
      rundSoportes = await this.dataSource.query(
        `SELECT s.id, s.bloque, s.tipo_soporte, s.documento_carpeta_id, s.nombre_archivo,
                s.estado, s.fecha_vencimiento, s.observacion, s."createdAt"
           FROM academic_work_plan."RundSoporteCampo" s
           JOIN academic_work_plan."Docente" d ON d.id = s.docente_id
          WHERE d."personaId" = $1`,
        [personaId],
      );
    } catch {
      /* schema/tabla no disponible — fallback silencioso */
    }

    for (const sop of rundSoportes) {
      if (seenRundSoporteIds.has(sop.id)) continue;
      docsDto.push({
        id: `rund:${sop.id}`,
        carpeta_id: `carpeta:${carpeta.personaId}`,
        rund_soporte_id: sop.id,
        tipo_documento_id: sop.tipo_soporte ? `rund_${String(sop.tipo_soporte).toLowerCase()}` : null,
        nombre: sop.nombre_archivo || `${sop.tipo_soporte || 'soporte'}.pdf`,
        categoria: 'rund',
        tipo_archivo: this.guessTipoArchivo(sop.nombre_archivo),
        tamano_bytes: 0,
        estado: this.mapRundEstado(sop.estado),
        comentarios: sop.observacion || null,
        url_archivo: sop.documento_carpeta_id || null,
        fecha_subida: sop.createdAt || null,
        fecha_validacion: null,
        fecha_vencimiento: sop.fecha_vencimiento || null,
        validado_por: null,
        bloque_rund: sop.bloque || null,
        origen: 'rund',
      });
    }

    return docsDto;
  }

  /**
   * Persiste un documento subido. Si `rundSoporteId` viene, lo enlaza al soporte RUND.
   */
  async createDocumento(data: {
    personaId: string;
    nombre: string;
    urlArchivo: string;
    tipoDocumentoId?: string | null;
    rundSoporteId?: string | null;
    categoria?: string;
    tipoArchivo?: string | null;
    tamanoBytes?: number;
    comentarios?: string | null;
    fechaVencimiento?: Date | null;
  }) {
    if (!data?.personaId) throw new BadRequestException('personaId es requerido');
    if (!data?.nombre) throw new BadRequestException('nombre es requerido');
    if (!data?.urlArchivo) throw new BadRequestException('urlArchivo es requerido');

    const carpeta = await this.ensureCarpetaForPersona(data.personaId);

    const doc = this.documentoRepo.create({
      carpetaDigitalId: carpeta.id,
      tipoDocumentoId: data.tipoDocumentoId || null,
      rundSoporteId: data.rundSoporteId || null,
      nombre: data.nombre,
      categoria: data.categoria || 'otros',
      tipoArchivo: data.tipoArchivo || this.guessTipoArchivo(data.nombre),
      tamanoBytes: Number(data.tamanoBytes || 0),
      urlArchivo: data.urlArchivo,
      estado: 'pendiente',
      comentarios: data.comentarios || null,
      fechaVencimiento: data.fechaVencimiento || null,
      fechaSubida: new Date(),
    });
    const saved = await this.documentoRepo.save(doc);
    return this.toDocumentoDto(saved, carpeta.personaId);
  }

  async reclassifyDocumento(documentoId: string, data: { tipoDocumentoId?: string; categoria?: string }) {
    const id = String(documentoId || '').replace(/^rund:/, '');
    const existing = await this.documentoRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Documento no encontrado');
    if (data.tipoDocumentoId) existing.tipoDocumentoId = data.tipoDocumentoId;
    if (data.categoria) existing.categoria = data.categoria;
    const saved = await this.documentoRepo.save(existing);
    return this.toDocumentoDto(saved);
  }

  async validateDocumento(documentoId: string, data: { estado: 'validado' | 'rechazado'; comentarios?: string; validadoPor?: string }) {
    const id = String(documentoId || '').replace(/^rund:/, '');
    const existing = await this.documentoRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Documento no encontrado');
    if (!['validado', 'rechazado'].includes(data.estado)) {
      throw new BadRequestException('estado debe ser validado o rechazado');
    }
    existing.estado = data.estado;
    existing.comentarios = data.comentarios || existing.comentarios;
    existing.validadoPor = data.validadoPor || existing.validadoPor;
    existing.fechaValidacion = new Date();
    const saved = await this.documentoRepo.save(existing);
    return this.toDocumentoDto(saved);
  }

  async deleteDocumento(documentoId: string) {
    const id = String(documentoId || '').replace(/^rund:/, '');
    const existing = await this.documentoRepo.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('Documento no encontrado');
    await this.documentoRepo.delete(id);
    return { id };
  }

  // ═══════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════

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

  private guessTipoArchivo(nombre: string | null | undefined): string {
    if (!nombre) return 'pdf';
    const ext = String(nombre).split('.').pop()?.toLowerCase();
    return ext || 'pdf';
  }

  private mapRundEstado(estado: string | null | undefined): 'pendiente' | 'validado' | 'rechazado' | 'vencido' {
    const n = String(estado || '').toLowerCase().trim();
    if (n === 'aprobado' || n === 'aceptado' || n === 'ok' || n === 'validado') return 'validado';
    if (n === 'rechazado' || n === 'devuelto') return 'rechazado';
    if (n === 'vencido') return 'vencido';
    return 'pendiente';
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

  private toDocumentoDto(d: DocumentoCarpetaDigital, personaId?: string) {
    return {
      id: d.id,
      carpeta_id: `carpeta:${personaId || ''}`,
      carpeta_digital_id: d.carpetaDigitalId,
      tipo_documento_id: d.tipoDocumentoId,
      rund_soporte_id: d.rundSoporteId,
      nombre: d.nombre,
      categoria: d.categoria,
      tipo_archivo: d.tipoArchivo,
      tamano_bytes: Number(d.tamanoBytes || 0),
      url_archivo: d.urlArchivo,
      estado: d.estado,
      comentarios: d.comentarios,
      validado_por: d.validadoPor,
      fecha_subida: d.fechaSubida,
      fecha_validacion: d.fechaValidacion,
      fecha_vencimiento: d.fechaVencimiento,
      origen: d.rundSoporteId ? 'rund' : 'manual',
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
