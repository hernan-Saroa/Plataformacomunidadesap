import { ConflictException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { BancoDocenteEntity } from '../../entities/banco-docente.entity';
import { RundAuthStateSyncService } from './rund-auth-state-sync.service';

function coalesceString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/** Campos del RUND que se validan documentalmente y el bloque al que pertenecen. */
export const CAMPOS_SOPORTE_RUND: ReadonlyArray<{ campo: string; tipo: string }> = [
  { campo: 'DOCUMENTO_IDENTIDAD', tipo: 'IDENTIDAD' },
  { campo: 'TIPO_DOCUMENTO', tipo: 'IDENTIDAD' },
  { campo: 'NOMBRE_COMPLETO', tipo: 'IDENTIDAD' },
  { campo: 'FECHA_NACIMIENTO', tipo: 'IDENTIDAD' },
  { campo: 'GENERO', tipo: 'IDENTIDAD' },
  { campo: 'CORREO_INSTITUCIONAL', tipo: 'CONTACTO' },
  { campo: 'VINCULACION', tipo: 'VINCULACION' },
  { campo: 'TERRITORIAL', tipo: 'VINCULACION' },
  { campo: 'DEDICACION', tipo: 'VINCULACION' },
  { campo: 'CATEGORIA_ESCALAFON', tipo: 'ESCALAFON' },
  { campo: 'INICIO_VINCULACION', tipo: 'VINCULACION' },
  { campo: 'FIN_VINCULACION', tipo: 'VINCULACION' },
  { campo: 'ACTO_ADMINISTRATIVO', tipo: 'VINCULACION' },
  { campo: 'PUNTAJE_SALARIAL', tipo: 'ESCALAFON' },
  { campo: 'SITUACION_ADMINISTRATIVA', tipo: 'SITUACION' },
  { campo: 'NIVEL_FORMACION', tipo: 'FORMACION' },
  { campo: 'TITULO_PREGRADO', tipo: 'FORMACION' },
  { campo: 'TITULO_ESPECIALIZACION', tipo: 'FORMACION' },
  { campo: 'TITULO_MAESTRIA', tipo: 'FORMACION' },
  { campo: 'TITULO_DOCTORADO', tipo: 'FORMACION' },
  { campo: 'TITULO_POSDOCTORADO', tipo: 'FORMACION' },
  { campo: 'NUCLEO_TEMATICO', tipo: 'VINCULACION' },
  { campo: 'PERFIL_ACADEMICO', tipo: 'FORMACION' },
  { campo: 'ULTIMA_EVALUACION', tipo: 'EVALUACION' },
];

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
    @Optional() private readonly authState?: RundAuthStateSyncService,
  ) {}

  /** Acepta el id del docente o el de su persona (id_person o id de usuario en auth). */
  private async resolverDocente(docenteKey: string): Promise<BancoDocenteEntity> {
    let docente = await this.buscarDocente(docenteKey);

    if (!docente) {
      const personId = await this.resolverPersonaEnAuth(docenteKey);
      if (personId) {
        docente = await this.buscarDocente(personId);
      }
    }

    if (!docente) throw new NotFoundException(`Docente ${docenteKey} no encontrado`);
    return docente;
  }

  private buscarDocente(key: string): Promise<BancoDocenteEntity | null> {
    const where: FindOptionsWhere<BancoDocenteEntity>[] = [{ id: key }];
    // personaId sigue siendo UUID. Un id textual del banco no puede enviarse a esa columna.
    // PostgreSQL admite UUID con/sin guiones, mayusculas y llaves externas.
    const uuidInput = key.startsWith('{') && key.endsWith('}') ? key.slice(1, -1) : key;
    if (/^[0-9a-f]{4}(?:-?[0-9a-f]{4}){7}$/i.test(uuidInput)) {
      where.push({ personaId: key });
    }
    return this.docenteRepo.findOne({ where });
  }

  private async resolverPersonaEnAuth(key: string): Promise<string | null> {
    try {
      const rows: Array<{ person_id: string | null }> = await this.dataSource.query(
        `SELECT p.id_person::text AS person_id
         FROM auth.personas p
         LEFT JOIN auth."user" u ON u.id_person = p.id_person
         WHERE p.id_person::text = $1 OR u.id_user::text = $1
         LIMIT 1`,
        [key],
      );
      return coalesceString(rows?.[0]?.person_id);
    } catch {
      // Algunos ambientes de auth usan id_tercero en lugar de id_person: sin resolución, el llamador recibe 404.
      return null;
    }
  }

  async getRundDocente(docenteKey: string) {
    const docente = await this.resolverDocente(docenteKey);

    let filas: any[] = await this.dataSource.query(
      `SELECT * FROM rund.validacion_documental WHERE docente_id = $1`,
      [docente.id],
    );

    if (filas.length === 0) {
      for (const item of CAMPOS_SOPORTE_RUND) {
        await this.dataSource.query(
          `INSERT INTO rund.validacion_documental (docente_id, campo_rund, tipo_documento_soporte, estado_documento)
           VALUES ($1, $2, $3, 'Sin cargar')
           ON CONFLICT (docente_id, campo_rund) DO NOTHING`,
          [docente.id, item.campo, item.tipo],
        );
      }
      filas = await this.dataSource.query(`SELECT * FROM rund.validacion_documental WHERE docente_id = $1`, [docente.id]);
    }

    const total = filas.length;
    const aceptados = filas.filter((r) => r.estado_documento === 'Aceptado').length;

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
