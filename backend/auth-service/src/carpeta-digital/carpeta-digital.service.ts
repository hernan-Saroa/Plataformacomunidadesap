import { BadRequestException, ConflictException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, IsNull, Repository } from 'typeorm';
import { Person } from '../users/person.entity';
import { CarpetaDigital } from './carpeta-digital.entity';
import { TipoDocumento } from './tipo-documento.entity';
import { DocumentoCarpetaDigital } from './documento-carpeta-digital.entity';
import { RundClient } from './rund-client';
import { auditRundDocuments, protectRundFolderDocument, isRundFolderDocument, rundOriginalResourceId } from './rund-document-access';
import { RundCarpetaClient } from './rund-carpeta.client';
import { PtaHistoricoClient } from './pta-historico.client';
import { CarpetaDocumentVersionsService } from './carpeta-document-versions.service';
import { assertCarpetaDocumentRevision, carpetaDocumentRevision } from './carpeta-document-revision';

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
    private readonly rundCarpetaClient: RundCarpetaClient,
    @Optional() private readonly documentVersions?: CarpetaDocumentVersionsService,
    @Optional() private readonly rund?: RundClient,
    @Optional() private readonly ptaHistorico?: PtaHistoricoClient,
  ) {}

  /** Bitácora: RUND si está configurado; si no, el propietario histórico (API de PTA, o SQL de transición). */
  private get auditTarget(): any {
    return this.rund || (this.ptaHistorico?.enabled ? this.ptaHistorico : this.dataSource);
  }

  async getAllCarpetas(user?: any, sessionToken?: string) {
    await this.ensureCarpetasForAllPersons();
    const carpetas = await this.carpetaRepo.find({
      relations: ['persona', 'persona.user', 'persona.seccional', 'persona.sede'],
      order: { createdAt: 'DESC' },
    });

    if (this.rundCarpetaClient?.enabled) {
      const stats = await this.aggregateStats(carpetas, user, sessionToken);
      return carpetas.map((carpeta,index) => ({ ...this.toCarpetaDto(carpeta,index), ...stats.get(carpeta.personaId) }));
    }
    const docs = await this.documentoRepo.find({ select: ['carpetaDigitalId', 'estado'] });
    return carpetas.map((carpeta, index) => ({ ...this.toCarpetaDto(carpeta, index),
      ...this.documentStats(docs.filter(doc => doc.carpetaDigitalId === carpeta.id)), alcance_conteo: 'auth', propietarios_incluidos: ['auth'], conteo_completo: true }));
  }

  async getCarpetaByPersona(personaId: string, user?: any, sessionToken?: string, aggregate = false) {
    const carpeta = await this.ensureCarpetaForPersona(personaId);
    const loaded = await this.carpetaRepo.findOne({
      where: { id: carpeta.id },
      relations: ['persona', 'persona.user', 'persona.seccional', 'persona.sede'],
    });
    if (aggregate && this.rundCarpetaClient?.enabled) {
      const stats = await this.aggregateStats([carpeta],user,sessionToken);
      return { ...this.toCarpetaDto(loaded || carpeta,0), ...stats.get(carpeta.personaId) };
    }
    const docs = await this.documentoRepo.find({ where: { carpetaDigitalId: carpeta.id }, select: ['estado'] });
    return { ...this.toCarpetaDto(loaded || carpeta, 0), ...this.documentStats(docs), alcance_conteo: 'auth', propietarios_incluidos: ['auth'], conteo_completo: true };
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

    const docs = await this.documentoRepo.find({ where: { carpetaDigitalId: carpeta.id }, select: ['estado'] });

    return {
      carpeta: { ...this.toCarpetaDto(carpetaCompleta, 0), ...this.documentStats(docs), alcance_conteo: 'auth', propietarios_incluidos: ['auth'], conteo_completo: true },
      tiposDocumentos: tipos
        .filter((tipo) => this.tipoAplicaAlaPersona(tipo, carpetaCompleta))
        .map((tipo) => this.toTipoDocumentoDto(tipo)),
    };
  }

  async getRundProfiles(personaId: string, user?: any, sessionToken?: string) {
    const carpeta=await this.ensureCarpetaForPersona(personaId);
    let legacy: any[];
    try {
      legacy=this.ptaHistorico?.enabled ? await this.ptaHistorico.perfilesPorPersona(carpeta.personaId)
        : await this.dataSource.query(`SELECT id,"personaId" AS persona_id,"periodoCarga" AS periodo_carga,estado
        FROM academic_work_plan."Docente" WHERE "personaId"=$1 ORDER BY "periodoCarga" DESC NULLS LAST,id LIMIT 201`,[carpeta.personaId]);
      if(legacy.length>200) throw new Error();
    } catch {throw new ServiceUnavailableException('No fue posible confirmar los perfiles históricos de PTA.');}
    const independent=this.rundCarpetaClient?.enabled ? await this.rundCarpetaClient.profiles(carpeta.personaId,sessionToken) : [];
    if(legacy.length) await auditRundDocuments(this.auditTarget,user,'CARPETA_DIGITAL_PERFILES_PTA',carpeta.personaId);
    const perfil=(p:any,propietario:string)=>({id:String(p.id),persona_id:carpeta.personaId,propietario,
      periodo_carga:p.periodo_carga ?? null,estado:p.estado,clave:`${propietario}:${p.id}`});
    return {persona_id:carpeta.personaId,complete:true,propietario_predeterminado:this.rundCarpetaClient?.enabled?'rund':'pta',
      perfiles:[...independent.map(p=>perfil(p,'rund')),...legacy.map(p=>perfil(p,'pta'))]};
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
   *  2) academic_work_plan."RundSoporteCampo" (compatibilidad histórica PTA)
   *  3) API interna RUND (documentos propios, cuando la integración está habilitada)
   *
   * Acepta personaId puro o el formato "carpeta:<personaId>" (legado del frontend).
   */
  async listDocumentosByPersona(personaIdOrCarpetaId: string, user?: any, sessionToken?: string) {
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

    // 2) Compatibilidad histórica PTA; no consulta las tablas del propietario RUND nuevo.
    let rundSoportes: any[] = [];
    try {
      rundSoportes = this.ptaHistorico?.enabled ? await this.ptaHistorico.soportesPorPersonas([carpeta.personaId]) : await this.dataSource.query(
        `SELECT s.id, s.bloque, s.tipo_soporte, s.documento_carpeta_id, s.nombre_archivo,
                s.estado, s.fecha_vencimiento, s.observacion, s."createdAt",s.docente_id,d."periodoCarga" AS periodo_carga
           FROM academic_work_plan."RundSoporteCampo" s
           JOIN academic_work_plan."Docente" d ON d.id = s.docente_id
          WHERE d."personaId" = $1
            AND (NULLIF(TRIM(s.nombre_archivo),'') IS NOT NULL OR NULLIF(TRIM(s.documento_carpeta_id),'') IS NOT NULL)`,
        [carpeta.personaId],
      );
    } catch {
      if (this.rundCarpetaClient?.enabled || this.ptaHistorico?.enabled) throw new ServiceUnavailableException('No fue posible confirmar los documentos históricos de PTA.');
      /* schema/tabla no disponible — fallback silencioso */
    }

    for (const doc of docsDto) {
      const source=rundSoportes.find(s=>s.id===doc.rund_soporte_id);
      if(source) Object.assign(doc,{rund_perfil_id:source.docente_id,rund_perfil_propietario:'pta',
        tipo_soporte_rund:source.tipo_soporte,bloque_rund:source.bloque,periodo_carga:source.periodo_carga ?? null});
    }
    for (const sop of rundSoportes) {
      if (seenRundSoporteIds.has(sop.id)) continue;
      docsDto.push({
        servicio_propietario: 'pta', persistido: true,
        rund_perfil_id:sop.docente_id,rund_perfil_propietario:'pta',tipo_soporte_rund:sop.tipo_soporte,periodo_carga:sop.periodo_carga ?? null,
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

    if (docsDto.some(isRundFolderDocument)) {
      await auditRundDocuments(this.auditTarget, user, 'CARPETA_DIGITAL_LISTADO_RUND', personaId);
    }
    const independent = this.rundCarpetaClient?.enabled
      ? await this.rundCarpetaClient.listDocumentos(carpeta.personaId, sessionToken) : [];
    // IDs de propietario distintos: UUID coincidentes jamás ocultan ni reemplazan soportes PTA.
    return [...docsDto, ...independent].map((doc) => protectRundFolderDocument(doc, user));
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
  }, user?: any) {
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
    if (isRundFolderDocument(doc)) {
      await auditRundDocuments(this.auditTarget, user, 'CARPETA_DIGITAL_CARGAR_RUND', rundOriginalResourceId(doc.urlArchivo));
    }
    const saved = await this.documentoRepo.save(doc);
    return protectRundFolderDocument(this.toDocumentoDto(saved, carpeta.personaId), user);
  }

  async getDocumento(id: string, user?: any, sessionToken?: string) {
    if (id.startsWith('rund-service:')) {
      return protectRundFolderDocument(await this.rundCarpetaClient.getDocumento(id, sessionToken), user);
    }
    const rawId = id.replace(/^rund:/, '');
    if (!/^[0-9a-f-]{36}$/i.test(rawId)) throw new BadRequestException('Documento no válido.');
    if (id.startsWith('rund:')) {
      const rows = this.ptaHistorico?.enabled
        ? await this.ptaHistorico.personaDeSoporte(rawId).then(persona_id => persona_id ? [{ persona_id }] : [])
        : await this.dataSource.query(`SELECT d."personaId" AS persona_id FROM academic_work_plan."RundSoporteCampo" s
        JOIN academic_work_plan."Docente" d ON d.id = s.docente_id WHERE s.id = $1`, [rawId]);
      if (!rows[0]) throw new NotFoundException('Soporte histórico no encontrado.');
      const docs = await this.listDocumentosByPersona(rows[0].persona_id, user, sessionToken);
      const doc = docs.find(doc => doc.id === id);
      if (!doc) throw new NotFoundException('Soporte histórico no encontrado.');
      return { ...doc, servicio_propietario: 'pta', versionado_disponible: false };
    }
    const doc = await this.documentoRepo.findOne({ where: { id }, relations: ['carpetaDigital'] });
    if (!doc) throw new NotFoundException('Documento no encontrado.');
    if (isRundFolderDocument(doc)) await auditRundDocuments(this.auditTarget, user, 'CARPETA_DIGITAL_CONSULTAR_RUND', rundOriginalResourceId(doc.urlArchivo));
    return protectRundFolderDocument(this.toDocumentoDto(doc, doc.carpetaDigital?.personaId), user);
  }

  async reclassifyDocumento(documentoId: string, data: { tipoDocumentoId?: string; categoria?: string; revisionDocumento?: unknown }, user?: any) {
    return this.mutateDocumento(documentoId, data.revisionDocumento, async (existing, repo, db, manager) => {
      const isRund = isRundFolderDocument(existing);
      if (data.categoria && (typeof data.categoria !== 'string' || data.categoria.length > 80)) throw new BadRequestException('Categoría no válida.');
      if (this.documentVersions?.enabled && !isRund && isRundFolderDocument(data)) {
        const versions = await db.query('SELECT id_version FROM auth.documento_carpeta_version WHERE documento_id=$1 LIMIT 1', [existing.id]);
        if (versions.length) throw new ConflictException('Gestione el soporte RUND desde su propietario. Un historial general no se convierte en un soporte RUND.');
      }
      if (data.tipoDocumentoId && data.tipoDocumentoId !== existing.tipoDocumentoId && !isRund) {
        const tipos = manager ? manager.getRepository(TipoDocumento) : this.tipoDocumentoRepo;
        const tipo = await tipos.findOne({ where: { id: data.tipoDocumentoId } });
        if (!tipo?.activo || (tipo.carpetaDigitalId && tipo.carpetaDigitalId !== existing.carpetaDigitalId)) {
          throw new BadRequestException('El tipo de documento no está disponible para esta carpeta.');
        }
      }
      if (isRund || isRundFolderDocument(data)) await auditRundDocuments(this.rund || db, user, 'CARPETA_DIGITAL_RECLASIFICAR_RUND', rundOriginalResourceId(existing.urlArchivo));
      const changed = !isRund && ((!!data.tipoDocumentoId && data.tipoDocumentoId !== existing.tipoDocumentoId)
        || (!!data.categoria && data.categoria !== existing.categoria));
      if (data.tipoDocumentoId) existing.tipoDocumentoId = data.tipoDocumentoId;
      if (data.categoria && !isRund) existing.categoria = data.categoria;
      if (changed) { existing.estado = 'pendiente'; existing.validadoPor = null; existing.fechaValidacion = null; }
      const saved = changed || isRund ? await repo.save(existing) : existing;
      return protectRundFolderDocument(this.toDocumentoDto(saved), user);
    });
  }

  async validateDocumento(documentoId: string, data: { estado: 'validado' | 'rechazado'; comentarios?: string; validadoPor?: string; revisionDocumento?: unknown }, user?: any) {
    return this.mutateDocumento(documentoId, data.revisionDocumento, async (existing, repo, db) => {
      if (!['validado', 'rechazado'].includes(data.estado)) throw new BadRequestException('estado debe ser validado o rechazado');
      if (isRundFolderDocument(existing)) await auditRundDocuments(this.rund || db, user, 'CARPETA_DIGITAL_VALIDAR_RUND', rundOriginalResourceId(existing.urlArchivo));
      const signedId = user?.userId || user?.sub;
      const actors = typeof signedId === 'string' && /^[0-9a-f-]{36}$/i.test(signedId)
        ? await db.query('SELECT id_user FROM auth."user" WHERE id_user::text=$1 OR public_id::text=$1 LIMIT 1', [signedId]) : [];
      existing.estado = data.estado; existing.comentarios = data.comentarios || existing.comentarios;
      existing.validadoPor = actors[0]?.id_user || (this.documentVersions?.enabled || data.revisionDocumento !== undefined ? null : existing.validadoPor) || null;
      existing.fechaValidacion = new Date();
      return protectRundFolderDocument(this.toDocumentoDto(await repo.save(existing)), user);
    });
  }

  async deleteDocumento(documentoId: string, user?: any, revisionDocumento?: unknown) {
    return this.mutateDocumento(documentoId, revisionDocumento, async (existing, repo, db) => {
      if (isRundFolderDocument(existing)) await auditRundDocuments(this.rund || db, user, 'CARPETA_DIGITAL_RETIRAR_RUND', rundOriginalResourceId(existing.urlArchivo));
      await repo.delete(existing.id);
      return { id: existing.id };
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════
  private async mutateDocumento<T>(documentoId: string, revision: unknown,
    work: (doc: DocumentoCarpetaDigital, repo: Repository<DocumentoCarpetaDigital>, db: DataSource | EntityManager, manager?: EntityManager) => Promise<T>) {
    this.assertAuthDocumentOwner(documentoId);
    const id = String(documentoId || '').replace(/^rund:/, '');
    const apply = (doc: DocumentoCarpetaDigital, repo: Repository<DocumentoCarpetaDigital>, db: DataSource | EntityManager, manager?: EntityManager) => {
      assertCarpetaDocumentRevision(doc, revision, this.documentVersions?.enabled || false);
      return work(doc, repo, db, manager);
    };
    // Comprobar y mutar dentro del mismo bloqueo que reemplaza/restaura archivos.
    if (this.documentVersions?.enabled || revision !== undefined) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new BadRequestException('Documento Auth no válido.');
      return this.dataSource.transaction(async manager => {
        const repo = manager.getRepository(DocumentoCarpetaDigital);
        const doc = await repo.findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
        if (!doc) throw new NotFoundException('Documento no encontrado');
        return apply(doc, repo, manager, manager);
      });
    }
    // Compatibilidad con clientes previos mientras el historial siga deshabilitado.
    const doc = await this.documentoRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return apply(doc, this.documentoRepo, this.dataSource);
  }
  private assertAuthDocumentOwner(id: string) {
    if (String(id || '').startsWith('rund-service:')) {
      throw new ConflictException('Este documento pertenece a RUND. Gestione sus cambios y versiones desde el módulo RUND.');
    }
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
    personaId = String(personaId || '').replace(/^(carpeta|persona):/, '');
    if (!/^[0-9a-f-]{36}$/i.test(personaId)) throw new BadRequestException('Se requiere el UUID de persona o usuario.');
    const existing = await this.carpetaRepo.findOne({ where: { personaId } });
    if (existing) return existing;

    let person = await this.personRepo.findOne({ where: { id: personaId } });
    if (!person) {
      const users = await this.dataSource.query(`SELECT id_person FROM auth."user" WHERE id_user::text=$1 OR public_id::text=$1 LIMIT 1`, [personaId]);
      if (users[0]?.id_person) {
        person = await this.personRepo.findOne({ where: { id: users[0].id_person } });
        const canonicalFolder = await this.carpetaRepo.findOne({ where: { personaId: users[0].id_person } });
        if (canonicalFolder) return canonicalFolder;
      }
    }
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

  private documentStats(docs: Array<Pick<DocumentoCarpetaDigital, 'estado'>>) {
    return { total_documentos: docs.length, documentos_completos: docs.filter(doc => doc.estado === 'validado').length,
      documentos_pendientes: docs.filter(doc => doc.estado === 'pendiente').length,
      documentos_rechazados: docs.filter(doc => doc.estado === 'rechazado').length,
      documentos_vencidos: docs.filter(doc => doc.estado === 'vencido').length };
  }

  /** Comparte con el listado la exclusión explícita de copias PTA enlazadas. */
  private async aggregateStats(carpetas: CarpetaDigital[], user?: any, sessionToken?: string) {
    const result = new Map<string, any>();
    if (!carpetas.length) return result;
    const personas = carpetas.map(c => c.personaId);
    const local = await this.dataSource.transaction('REPEATABLE READ', async manager => {
      const docs = await manager.getRepository(DocumentoCarpetaDigital).find({
        where: { carpetaDigitalId: In(carpetas.map(c => c.id)) }, select: ['id','carpetaDigitalId','estado','rundSoporteId'] });
      let legacy: any[];
      try {
        legacy = this.ptaHistorico?.enabled ? await this.ptaHistorico.soportesPorPersonas(personas) : await manager.query(`SELECT d."personaId" AS persona_id,s.id,s.estado
          FROM academic_work_plan."RundSoporteCampo" s JOIN academic_work_plan."Docente" d ON d.id=s.docente_id
          WHERE d."personaId"=ANY($1::uuid[])
            AND (NULLIF(TRIM(s.nombre_archivo),'') IS NOT NULL OR NULLIF(TRIM(s.documento_carpeta_id),'') IS NOT NULL)`, [personas]);
      } catch { throw new ServiceUnavailableException('No fue posible confirmar los contadores históricos de PTA.'); }
      return { docs, legacy };
    });
    const remote = await this.rundCarpetaClient.stats(personas,sessionToken);
    for (const carpeta of carpetas) {
      const docs = local.docs.filter(d => d.carpetaDigitalId === carpeta.id);
      const links = new Set(docs.filter(d => d.rundSoporteId).map(d => d.rundSoporteId));
      const legacy = local.legacy.filter(s => s.persona_id === carpeta.personaId && !links.has(s.id));
      const owners = { auth: this.documentStats(docs), pta: this.documentStats(legacy.map(s => ({ estado: this.mapRundEstado(s.estado) }))),
        rund: remote.get(carpeta.personaId) };
      if (!owners.rund) throw new ServiceUnavailableException('RUND no confirmó todas las carpetas.');
      if (legacy.length || links.size) await auditRundDocuments(this.auditTarget,user,'CARPETA_DIGITAL_CONTEO_RUND',carpeta.personaId);
      const total = this.documentStats([]);
      for (const name of Object.keys(total)) total[name] = owners.auth[name]+owners.pta[name]+owners.rund[name];
      const { persona_id: _identity, ...rund } = owners.rund;
      result.set(carpeta.personaId,{ ...total, alcance_conteo: 'carpeta', conteo_completo: true,
        propietarios_incluidos: ['auth','pta','rund'], estadisticas_por_propietario: { ...owners, rund } });
    }
    return result;
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
      servicio_propietario: 'auth', persistido: true, versionado_disponible: this.documentVersions?.eligible(d) || false, version_actual: null,
      revision_documento: carpetaDocumentRevision(d), requiere_revision_documento: !!this.documentVersions?.enabled && !isRundFolderDocument(d),
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
