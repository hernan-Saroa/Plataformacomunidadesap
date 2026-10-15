import { ConflictException, Injectable, NotFoundException, Optional, ServiceUnavailableException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BancoDocenteEntity } from '../../entities/banco-docente.entity';
import { RundAuthStateSyncService } from './rund-auth-state-sync.service';
import { CAMPOS_SOPORTE_RUND } from './rund-document-fields';
import { AuthIdentityClient } from '../../common/auth-identity.client';
export { CAMPOS_SOPORTE_RUND } from './rund-document-fields';

/**
 * Validación documental por campo del RUND (rund.validacion_documental) y su
 * sincronización desde Carpeta Digital. Antes vivía en el servicio PTA.
 */
@Injectable()
export class RundValidacionService {
  constructor(
    @InjectRepository(BancoDocenteEntity)
    private readonly docenteRepo: Repository<BancoDocenteEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly identities: AuthIdentityClient,
    @Optional() private readonly authState?: RundAuthStateSyncService,
  ) {}

  /** Acepta el id del docente o el de su persona (id_person o id de usuario en auth). */
  private async resolverDocente(docenteKey: string): Promise<BancoDocenteEntity> {
    let docente = await this.buscarDocente(docenteKey);

    if (!docente) {
      const personId = await this.identities.resolver(docenteKey);
      if (personId) {
        docente = await this.buscarDocente(personId);
      }
    }

    if (!docente) throw new NotFoundException(`Docente ${docenteKey} no encontrado`);
    return docente;
  }

  private async buscarDocente(key: string): Promise<BancoDocenteEntity | null> {
    // Un ID de perfil explícito tiene prioridad sobre cualquier alias de persona.
    const exacto = await this.docenteRepo.findOne({ where: { id: key } });
    if (exacto) return exacto;
    // personaId sigue siendo UUID. Un id textual del banco no puede enviarse a esa columna.
    // PostgreSQL admite UUID con/sin guiones, mayusculas y llaves externas.
    const uuidInput = key.startsWith('{') && key.endsWith('}') ? key.slice(1, -1) : key;
    if (/^[0-9a-f]{4}(?:-?[0-9a-f]{4}){7}$/i.test(uuidInput)) {
      const perfiles = await this.docenteRepo.find({ where: { personaId: key }, take: 2, order: { id: 'ASC' } });
      if (perfiles.length > 1) throw new ConflictException('La persona tiene varios perfiles RUND. Consulte el identificador del perfil y su período.');
      return perfiles[0] || null;
    }
    return null;
  }

  async getRundDocente(docenteKey: string) {
    const docente = await this.resolverDocente(docenteKey);

    let filas: any[] = await this.dataSource.query(
      `SELECT * FROM rund.validacion_documental WHERE docente_id = $1`,
      [docente.id],
    );

    const existentes = new Set(filas.map(row => row.campo_rund));
    const faltantes = CAMPOS_SOPORTE_RUND.filter(item => !existentes.has(item.campo));
    if (faltantes.length) {
      // Una sentencia atómica: solo añade campos ausentes; nunca cambia decisiones
      // ni metadatos ya persistidos, incluso si dos consultas inicializan a la vez.
      await this.dataSource.query(
        `INSERT INTO rund.validacion_documental (docente_id, campo_rund, tipo_documento_soporte, estado_documento)
         SELECT $1, campo, tipo, 'Sin cargar'
         FROM unnest($2::text[], $3::text[]) AS faltantes(campo, tipo)
         ON CONFLICT (docente_id, campo_rund) DO NOTHING`,
        [docente.id, faltantes.map(item => item.campo), faltantes.map(item => item.tipo)],
      );
      filas = await this.dataSource.query(`SELECT * FROM rund.validacion_documental WHERE docente_id = $1`, [docente.id]);
    }

    const estados = new Map(filas.map(row => [row.campo_rund, row.estado_documento]));
    const permitidos = ['Sin cargar', 'Pendiente', 'Aceptado', 'Rechazado', 'No aplica'];
    if (estados.size !== filas.length || CAMPOS_SOPORTE_RUND.some(item => !permitidos.includes(estados.get(item.campo)))) {
      throw new ServiceUnavailableException('No fue posible confirmar todos los estados documentales RUND.');
    }
    const total = CAMPOS_SOPORTE_RUND.length;
    const aceptados = CAMPOS_SOPORTE_RUND.filter(item => estados.get(item.campo) === 'Aceptado').length;

    return {
      docenteId: docente.id,
      personaId: docente.personaId,
      ...(this.authState?.enabled ? { carpetaAuth: await this.authState.getPersona(docente.personaId) } : {}),
      completitud: total > 0 ? Math.round((aceptados / total) * 100) : 0,
      validaciones: filas.map((r) => ({
        id: r.id,
        campo_rund: r.campo_rund,
        tipo_documento_soporte: r.tipo_documento_soporte,
        estado_documento: r.estado_documento,
        fecha_carga: r.fecha_carga,
        fecha_validacion: r.fecha_validacion,
        validado_por: r.validado_por,
        observacion: r.observacion,
      })),
    };
  }

  async syncRundDocuments(docenteKey: string, body: unknown = {}) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length) {
      throw new ConflictException('Los estados documentales se consultan al propietario Auth; envíe un objeto vacío.');
    }
    if (!this.authState?.enabled) throw new ConflictException('Sincronización de carpeta deshabilitada.');
    // Identidad inequívoca del banco: una persona puede tener perfiles en varios periodos.
    const docente = await this.docenteRepo.findOne({ where: { id: docenteKey } });
    if (!docente) throw new NotFoundException(`Docente ${docenteKey} no encontrado`);
    return this.authState.syncPersona(docente.personaId);
  }
}
