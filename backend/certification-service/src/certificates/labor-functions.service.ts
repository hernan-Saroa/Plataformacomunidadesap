import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, In, IsNull, Repository } from 'typeorm';
import { CertificateRequest } from './certificate-request.entity';
import { LaborOracleIntegrationService, type LaborOracleSuggestedRequest } from './labor-oracle-integration.service';
import { LaborFunctionProfile } from './labor-function-profile.entity';
import { LaborFunction } from './labor-function.entity';
import {
  findDuplicateLaborFunctions,
  normalizeCombinedPositionCode,
  normalizeGradeCode,
  normalizePositionCode,
  resolveLaborInternalGroup,
  normalizeLaborFunctionDocument,
  normalizeLaborFunctionText,
  parseLaborFunctions,
  parseLaborFunctionsRaw,
} from './labor-functions.utils';
import { buildLaborOrganizationContext, withLaborOrganization } from './labor-organization-context.utils';

export type LaborFunctionProfilePayload = {
  idNumber?: string | number;
  id_number?: string | number;
  sourceSheet?: string;
  source_sheet?: string;
  functions?: string[] | string;
  isActive?: boolean;
  is_active?: boolean;
  updatedBy?: string;
  updated_by?: string;
  rowNumber?: number;
};

// Other employment fields may exist, but never participate in the association.
export type LaborMatchableRequest = {
  id_number?: string | null;
  [key: string]: unknown;
};
export type LaborFunctionResolution = {
  available: boolean;
  count: number;
  reason: 'MATCHED' | 'NOT_FOUND' | 'AMBIGUOUS';
  profile: LaborFunctionProfile | null;
  functions: Array<{ ordinal: number; description: string }>;
};
type NormalizedProfilePayload = {
  id_number: string;
  match_key: string;
  source_sheet: string | null;
  is_active: boolean;
  updated_by: string | null;
  functions: string[];
};

@Injectable()
export class LaborFunctionsService {
  constructor(
    @InjectRepository(LaborFunctionProfile)
    private readonly profileRepo: Repository<LaborFunctionProfile>,
    @InjectRepository(LaborFunction)
    private readonly functionRepo: Repository<LaborFunction>,
    @InjectRepository(CertificateRequest)
    private readonly requestRepo: Repository<CertificateRequest>,
    private readonly dataSource: DataSource,
    private readonly laborOracleIntegrationService: LaborOracleIntegrationService,
  ) {}
  private readonly logger = new Logger(LaborFunctionsService.name);

  private associationIdentity(request: any): string {
    const document = normalizeLaborFunctionText(request.id_number).replace(/\s+/g, '');
    const position = normalizeCombinedPositionCode(request.cod_cargo, request.cod_grade);
    return `${document}|${position}`;
  }

  private inferHierarchicalLevel(positionName?: string | null): string | null {
    const value = normalizeLaborFunctionText(positionName)
      .replace(/\s+grado\s+\d+$/, '')
      .trim();
    if (!value) return null;
    if (/\b(director|directivo|jefe de oficina)\b/.test(value)) return 'directivo';
    if (/\basesor\b/.test(value)) return 'asesor';
    if (/\bprofesional\b/.test(value)) return 'profesional';
    if (/\btecnico\b/.test(value)) return 'tecnico';
    if (/\b(asistencial|secretari|conductor|auxiliar|operario)\b/.test(value)) return 'asistencial';
    return null;
  }

  private duplicateFunctionCount(value: unknown): number {
    return findDuplicateLaborFunctions(parseLaborFunctionsRaw(value)).length;
  }
  private nullableText(value: unknown, maxLength = 255): string | null {
    const text = String(value ?? '')
      .replace(/\s+/g, ' ')
      .trim();
    return text ? text.slice(0, maxLength) : null;
  }
  private normalizePayload(
    payload: LaborFunctionProfilePayload,
  ): NormalizedProfilePayload {
    if (!payload || typeof payload !== 'object')
      throw new BadRequestException('Registro inválido.');
    const idNumber = normalizeLaborFunctionDocument(
      payload.idNumber ?? payload.id_number,
    );
    if (!idNumber)
      throw new BadRequestException(
        'Ingresa un número de identificación válido, de hasta 50 dígitos.',
      );
    const functions = parseLaborFunctions(payload.functions);
    if (!functions.length)
      throw new BadRequestException(
        'Agrega al menos una función, una por línea.',
      );
    if (functions.length > 500)
      throw new BadRequestException(
        'Cada persona puede contener máximo 500 funciones.',
      );
    if (functions.some((item) => item.length > 5000))
      throw new BadRequestException(
        'Cada función debe tener máximo 5.000 caracteres.',
      );
    if (functions.some((item) => item.length < 8))
      throw new BadRequestException(
        'Cada función debe tener al menos 8 caracteres.',
      );
    const active = payload.isActive ?? payload.is_active ?? true;
    if (typeof active !== 'boolean')
      throw new BadRequestException('El estado activo debe ser booleano.');
    return {
      id_number: idNumber,
      match_key: `document|${idNumber}`,
      source_sheet: this.nullableText(
        payload.sourceSheet ?? payload.source_sheet,
      ),
      is_active: active,
      updated_by: this.nullableText(payload.updatedBy ?? payload.updated_by),
      functions,
    };
  }
  private serializeProfile(profile: LaborFunctionProfile) {
    const functions = [...(profile.functions || [])]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((item) => ({
        id: item.id,
        ordinal: item.ordinal,
        description: item.description,
      }));
    return {
      id: profile.id,
      id_number: profile.id_number || null,
      needs_assignment: !profile.id_number,
      source_sheet: profile.source_sheet,
      is_active: profile.is_active,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
      functions,
      function_count: functions.length,
    };
  }
  private resolveFromProfiles(
    request: { id_number?: string | null },
    profiles: LaborFunctionProfile[],
  ): LaborFunctionResolution {
    const document = normalizeLaborFunctionDocument(request.id_number);
    const candidates = document
      ? profiles.filter(
          (profile) => profile.is_active && profile.id_number === document,
        )
      : [];
    if (candidates.length !== 1)
      return {
        available: false,
        count: 0,
        reason: candidates.length > 1 ? 'AMBIGUOUS' : 'NOT_FOUND',
        profile: null,
        functions: [],
      };
    const profile = candidates[0];
    const functions = this.serializeProfile(profile).functions.map(
      ({ ordinal, description }) => ({ ordinal, description }),
    );
    return {
      available: functions.length > 0,
      count: functions.length,
      reason: functions.length ? 'MATCHED' : 'NOT_FOUND',
      profile,
      functions,
    };
  }
  async resolveForRequest(request: {
    id_number?: string | null;
  }): Promise<LaborFunctionResolution> {
    const document = normalizeLaborFunctionDocument(request.id_number);
    if (!document) return this.resolveFromProfiles(request, []);
    const profiles = await this.profileRepo.find({
      where: { id_number: document, is_active: true },
      relations: ['functions'],
    });
    return this.resolveFromProfiles(request, profiles);
  }
  private async catalog(search?: string) {
    const profiles = await this.profileRepo.find({
      relations: ['functions'],
      order: { created_at: 'DESC', id: 'ASC' },
    });
    const term = String(search || '').trim();
    const document = normalizeLaborFunctionDocument(term);
    const filtered = term
      ? profiles.filter(
          (profile) => document && profile.id_number?.includes(document),
        )
      : profiles;
    return { profiles, filtered };
  }
  async list(options: { search?: string; page?: number; limit?: number } = {}) {
    const { profiles, filtered } = await this.catalog(options.search);
    const limit = Math.min(
      100,
      Math.max(1, Math.floor(Number(options.limit) || 20)),
    );
    const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
    const page = Math.min(
      totalPages,
      Math.max(1, Math.floor(Number(options.page) || 1)),
    );
    return {
      items: filtered
        .slice((page - 1) * limit, page * limit)
        .map((profile) => this.serializeProfile(profile)),
      total: filtered.length,
      page,
      limit,
      totalPages,
      stats: {
        profiles: profiles.length,
        functions: profiles.reduce(
          (sum, p) => sum + (p.functions?.length || 0),
          0,
        ),
        pending: profiles.filter((p) => !p.id_number).length,
      },
    };
  }
  async listAllForSelection(options: { search?: string } = {}) {
    const { filtered } = await this.catalog(options.search);
    return {
      total: filtered.length,
      items: filtered.map((profile) => ({
        id: profile.id,
        id_number: profile.id_number || null,
        function_count: profile.functions?.length || 0,
      })),
    };
  }
  async lookupPerson(
    search: string,
    options: {
      limit?: number;
      selectPreferred?: (requests: any[]) => any | null;
    } = {},
  ) {
    const term = String(search ?? '').trim();
    if (term.length < 3) {
      throw new BadRequestException(
        'Escribe al menos 3 caracteres del nombre o del número de documento.',
      );
    }
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 10));

    const localRequests = await this.requestRepo.find({
      where: [
        { id_number: ILike(`%${term}%`) },
        { full_name: ILike(`%${term}%`) },
      ],
      order: { created_at: 'DESC' },
      take: 200,
    });

    let oracleRows: LaborOracleSuggestedRequest[] = [];
    let oracleAvailable = false;
    if (this.laborOracleIntegrationService?.isEnabled?.()) {
      try {
        oracleRows =
          await this.laborOracleIntegrationService.findSuggestedRequestsBySearch(
            term,
            200,
          );
        oracleAvailable = true;
      } catch (error: any) {
        this.logger.warn(
          `No se pudo consultar el empleado en Oracle FNC: ${
            error?.message || error
          }. Se responde solo con los datos locales.`,
        );
      }
    }

    // Agrupar por persona (documento). Una misma vinculación puede llegar por
    // las dos fuentes: la local manda porque trae número de solicitud y estado.
    const personas = new Map<
      string,
      { origen: 'local' | 'oracle'; rows: any[] }
    >();
    const documentoDe = (row: any) =>
      normalizeLaborFunctionText(row?.id_number).replace(/\s+/g, '');

    // La deduplicación aplica SOLO entre fuentes. Dentro de la tabla local dos
    // filas pueden compartir documento y cod_cargo siendo vinculaciones
    // distintas y legítimas (p. ej. un encargo terminado y su prórroga
    // vigente). Descartarlas se llevaba por delante la vinculación ACTIVA, y la
    // selección terminaba devolviendo el cargo base en vez del que sale en el
    // certificado.
    const identidadesLocales = new Set(
      localRequests.map((row) => this.associationIdentity(row)),
    );

    const push = (row: any, origen: 'local' | 'oracle') => {
      const documento = documentoDe(row);
      if (!documento) return;
      const actual = personas.get(documento);
      if (!actual) {
        personas.set(documento, { origen, rows: [row] });
        return;
      }
      actual.rows.push(row);
      if (origen === 'local') actual.origen = 'local';
    };

    localRequests.forEach((row) => push(row, 'local'));
    oracleRows
      .filter((row) => !identidadesLocales.has(this.associationIdentity(row)))
      .forEach((row) => push(row, 'oracle'));

    const seleccionadas = Array.from(personas.values()).map(
      ({ origen, rows }) => {
        const elegida =
          (options.selectPreferred ? options.selectPreferred(rows) : null) ||
          rows[0];
        return {
          origen: rows.length === 1 ? origen : ((elegida as any).id ? 'local' : 'oracle'),
          row: { ...elegida, ...buildLaborOrganizationContext(elegida, rows) },
          vinculaciones: rows.length,
        };
      },
    );

    // Function assignment is by document; the labor matrix below is informational.
    const documents = [...personas.keys()]
      .map((value) => normalizeLaborFunctionDocument(value))
      .filter(Boolean);
    const documentProfiles = documents.length
      ? await this.profileRepo.find({
          where: { id_number: In(documents) },
          relations: ['functions'],
        })
      : [];

    const combinedCodes = Array.from(
      new Set(
        seleccionadas
          .map(({ row }) =>
            normalizeCombinedPositionCode(row.cod_cargo, row.cod_grade),
          )
          .filter(Boolean),
      ),
    );
    const legacyProfiles = combinedCodes.length
      ? await this.profileRepo.find({
          where: { combined_code: In(combinedCodes), id_number: IsNull() },
          relations: ['functions'],
        })
      : [];

    const describeProfile = (profile: LaborFunctionProfile) => ({
      id: profile.id,
      combined_code: profile.combined_code,
      position_code: profile.position_code,
      grade_code: profile.grade_code,
      hierarchical_level: profile.hierarchical_level,
      position_name: profile.position_name,
      department_name: profile.department_name,
      internal_group: resolveLaborInternalGroup(
        profile.internal_group,
        profile.cost_center,
      ),
      function_count: profile.functions?.length || 0,
      is_active: profile.is_active,
      id_number: profile.id_number,
    });

    const items = seleccionadas
      .slice(0, limit)
      .map(({ row: selectedRow, origen, vinculaciones }) => {
        const row = withLaborOrganization(selectedRow);
        const combinedCode = normalizeCombinedPositionCode(
          row.cod_cargo,
          row.cod_grade,
        );
        const mismoCargo = legacyProfiles.filter(
          (profile) => profile.combined_code === combinedCode,
        );
        const resolution = this.resolveFromProfiles(row, documentProfiles);
        const matched = resolution.available ? resolution.profile : null;

        const grade = normalizeGradeCode(row.cod_grade);
        const basePositionCode = normalizePositionCode(
          row.base_position_code ||
            (grade && combinedCode.endsWith(grade)
              ? combinedCode.slice(0, -grade.length)
              : row.cod_cargo),
        );

        const matrix = {
          position_code: basePositionCode || null,
          grade_code: grade || null,
          combined_code: combinedCode || null,
          hierarchical_level:
            row.hierarchical_level ||
            this.inferHierarchicalLevel(
              row.position_name || row.career_category,
            ),
          position_name: row.position_name || row.career_category || null,
          department_name:
            row.organization_department ||
            row.department ||
            row.position_location ||
            null,
          internal_group:
            resolveLaborInternalGroup(
              row.internal_group,
              row.cost_center,
              row.position_location,
            ) || null,
        };

        // En vez de listar todos los perfiles del cod_cargo (pueden ser
        // decenas y no dicen nada), se buscan los que fallan por UN solo dato:
        // ahí está el diagnóstico util.
        const camposComparables: Array<{
          key: 'hierarchical_level' | 'position_name' | 'department_name' | 'internal_group';
          label: string;
        }> = [
          { key: 'hierarchical_level', label: 'Nivel jerárquico' },
          { key: 'position_name', label: 'Denominación' },
          { key: 'department_name', label: 'Dependencia' },
          { key: 'internal_group', label: 'Grupo interno' },
        ];

        const cercanos = matched
          ? []
          : mismoCargo
              .map((profile) => {
                const descrito = describeProfile(profile);
                const diferencias = camposComparables.filter(({ key }) => {
                  const esperado = normalizeLaborFunctionText(descrito[key]);
                  const real = normalizeLaborFunctionText(matrix[key]);
                  return esperado !== real;
                });
                return {
                  ...descrito,
                  differing_fields: diferencias.map((item) => item.label),
                };
              })
              .filter((item) => item.differing_fields.length === 1)
              .slice(0, 3);

        return {
          origen,
          full_name: row.full_name || null,
          id_number: row.id_number || null,
          document_type: row.document_type || null,
          email: row.email || null,
          hiring_date: row.hiring_date || null,
          position_category: row.position_category || null,
          status: row.status || null,
          request_number: row.request_number || null,
          // Valor impreso, separado de los datos exactos del perfil del cargo.
          certificate_dependency: row.certificate_dependency ??
            (row.organization_department ||
              row.department ||
              resolveLaborInternalGroup(row.internal_group, row.cost_center) ||
              ''),
          /** Cuántas vinculaciones tiene la persona; se muestra solo esta. */
          total_vinculaciones: vinculaciones,
          matrix,
          functions_match_status: resolution.reason,
          matched_profile: matched
            ? describeProfile(matched as LaborFunctionProfile)
            : null,
          profiles_same_code: mismoCargo.length,
          near_matches: cercanos,
        };
      });

    return {
      search: term,
      total: seleccionadas.length,
      limit,
      items,
      sources: {
        local: items.filter((item) => item.origen === 'local').length,
        oracle: items.filter((item) => item.origen === 'oracle').length,
        oracleAvailable,
      },
    };
  }

  async findOne(id: string) {
    const profile = await this.profileRepo.findOne({
      where: { id },
      relations: ['functions'],
    });
    if (!profile)
      throw new NotFoundException('Registro de funciones no encontrado.');
    return this.serializeProfile(profile);
  }
  private async persist(normalized: NormalizedProfilePayload, id?: string) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const profiles = manager.getRepository(LaborFunctionProfile);
        const functions = manager.getRepository(LaborFunction);
        let profile: LaborFunctionProfile | null = null;
        if (id) {
          profile = await profiles.findOne({
            where: { id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!profile)
            throw new NotFoundException('Registro de funciones no encontrado.');
        }
        const duplicate = await profiles.findOne({
          where: { id_number: normalized.id_number },
        });
        if (duplicate && duplicate.id !== id)
          throw new ConflictException(
            'Esta identificación ya tiene funciones registradas. Edítalas desde el listado.',
          );
        const { functions: descriptions, ...data } = normalized;
        profile = await profiles.save(
          profiles.create({
            ...(profile || {}),
            ...data,
            created_by: profile?.created_by || normalized.updated_by,
          }),
        );
        await functions.delete({ profile_id: profile.id });
        await functions.save(
          descriptions.map((description, index) =>
            functions.create({
              profile_id: profile!.id,
              ordinal: index + 1,
              description,
            }),
          ),
        );
        const saved = await profiles.findOneOrFail({
          where: { id: profile.id },
          relations: ['functions'],
        });
        return {
          ...this.serializeProfile(saved),
          action: id ? ('updated' as const) : ('created' as const),
        };
      });
    } catch (error) {
      if (error?.code === '23505')
        throw new ConflictException(
          'Esta identificación ya tiene funciones registradas. Edítalas desde el listado.',
        );
      throw error;
    }
  }
  async create(payload: LaborFunctionProfilePayload) {
    return this.persist(this.normalizePayload(payload));
  }
  async update(id: string, payload: LaborFunctionProfilePayload) {
    return this.persist(this.normalizePayload(payload), id);
  }

  async remove(id: string) {
    const profile = await this.profileRepo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException('Registro de funciones no encontrado.');
    }
    await this.profileRepo.remove(profile);
    return { id, deleted: true };
  }

  async removeMany(ids: unknown) {
    if (!Array.isArray(ids) || !ids.length) {
      throw new BadRequestException(
        'Selecciona al menos un registro de funciones para eliminar.',
      );
    }

    const normalizedIds = Array.from(
      new Set(ids.map((id) => String(id ?? '').trim()).filter(Boolean)),
    );
    if (!normalizedIds.length) {
      throw new BadRequestException(
        'Selecciona al menos un registro de funciones para eliminar.',
      );
    }
    if (normalizedIds.length > 5000) {
      throw new BadRequestException(
        'Solo se pueden eliminar hasta 5.000 registros por operación.',
      );
    }
    const invalidIds = normalizedIds.filter(
      (id) =>
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id,
        ),
    );
    if (invalidIds.length) {
      throw new BadRequestException(
        'La selección contiene identificadores de registro inválidos.',
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      const profiles = manager.getRepository(LaborFunctionProfile);
      const selectedProfiles = await profiles.find({
        where: { id: In(normalizedIds) },
        relations: ['functions'],
      });
      if (selectedProfiles.length !== normalizedIds.length) {
        throw new NotFoundException(
          'Uno o más registros seleccionados ya no existen. No se eliminó ningún registro; actualiza la matriz y vuelve a seleccionarlos.',
        );
      }

      const functionCount = selectedProfiles.reduce(
        (total, profile) => total + (profile.functions?.length || 0),
        0,
      );
      await profiles.remove(selectedProfiles);
      return {
        deleted: true as const,
        deletedCount: selectedProfiles.length,
        functionCount,
        ids: normalizedIds,
      };
    });
  }

  private assertBulkSize(rows: LaborFunctionProfilePayload[]) {
    if (!Array.isArray(rows) || !rows.length) {
      throw new BadRequestException('La carga masiva no contiene filas.');
    }
    if (rows.length > 5000) {
      throw new BadRequestException(
        'La carga masiva permite máximo 5.000 filas.',
      );
    }
  }

  async validateBulk(
    rows: LaborFunctionProfilePayload[],
    updatedBy?: string,
    sourceSheet = 'Matriz Funciones ESAP',
  ) {
    this.assertBulkSize(rows);
    const existingProfiles = await this.profileRepo.find({
      select: { id_number: true },
    });
    const existingKeys = new Set(
      existingProfiles.map((profile) => profile.id_number).filter(Boolean),
    );
    const seenKeys = new Map<
      string,
      { rowNumber: number; functionSignature: string }
    >();
    const results = rows.map((row, index) => {
      const rowNumber = Number(row?.rowNumber) || index + 1;
      try {
        const normalized = this.normalizePayload({
          ...row,
          sourceSheet: row.sourceSheet || row.source_sheet || sourceSheet,
          updatedBy: row.updatedBy || row.updated_by || updatedBy,
        });
        const functionSignature = normalized.functions
          .map(normalizeLaborFunctionText)
          .join('|');
        const duplicate = seenKeys.get(normalized.id_number);
        if (duplicate) {
          const exactDuplicate =
            duplicate.functionSignature === functionSignature;
          return {
            rowNumber,
            status: 'error' as const,
            action: null,
            id_number: normalized.id_number,
            function_count: normalized.functions.length,
            message: exactDuplicate
              ? `Esta fila es idéntica a la fila ${duplicate.rowNumber}: repite la misma identificación y funciones. Se omitirá para evitar guardar el perfil dos veces.`
              : `Esta fila repite la misma identificación de la fila ${duplicate.rowNumber}, pero contiene funciones diferentes. Unifica todas las funciones de esta persona en una sola fila.`,
          };
        }
        seenKeys.set(normalized.id_number, { rowNumber, functionSignature });
        if (existingKeys.has(normalized.id_number)) {
          return {
            rowNumber,
            status: 'error' as const,
            action: null,
            id_number: normalized.id_number,
            function_count: normalized.functions.length,
            message:
              'La identificación ya tiene funciones registradas. No se permiten registros duplicados; edítala desde la vista principal si necesitas cambiar sus funciones.',
          };
        }
        const omitidas = this.duplicateFunctionCount(row.functions);
        return {
          rowNumber,
          status: 'valid' as const,
          action: 'created' as const,
          id_number: normalized.id_number,
          function_count: normalized.functions.length,
          message: omitidas
            ? `Fila válida; se creará un registro nuevo. Se omitieron ${omitidas} función${omitidas === 1 ? '' : 'es'} repetida${omitidas === 1 ? '' : 's'} dentro de la fila.`
            : 'Fila válida; se creará un registro nuevo.',
        };
      } catch (error: any) {
        return {
          rowNumber,
          status: 'error' as const,
          action: null,
          message:
            error?.response?.message || error?.message || 'Fila inválida.',
        };
      }
    });
    const validResults = results.filter((item) => item.status === 'valid');
    return {
      summary: {
        total: rows.length,
        valid: validResults.length,
        invalid: rows.length - validResults.length,
        toCreate: validResults.length,
        toUpdate: 0,
      },
      results,
    };
  }

  async bulk(
    rows: LaborFunctionProfilePayload[],
    updatedBy?: string,
    sourceSheet = 'Matriz Funciones ESAP',
  ) {
    this.assertBulkSize(rows);

    const results: any[] = [];
    let created = 0;
    const updated = 0;
    for (const [index, row] of rows.entries()) {
      const rowNumber = Number(row?.rowNumber) || index + 1;
      try {
        const saved = await this.persist(
          this.normalizePayload({
            ...row,
            sourceSheet: row.sourceSheet || row.source_sheet || sourceSheet,
            updatedBy: row.updatedBy || row.updated_by || updatedBy,
          }),
          undefined,
        );
        created += 1;
        results.push({
          rowNumber,
          status: 'success',
          action: saved.action,
          id_number: saved.id_number,
          function_count: saved.function_count,
          message: 'Registro creado.',
        });
      } catch (error: any) {
        results.push({
          rowNumber,
          status: 'error',
          message:
            error?.response?.message || error?.message || 'Fila no procesada.',
        });
      }
    }
    const failed = results.filter((item) => item.status === 'error').length;
    return {
      summary: {
        total: rows.length,
        success: rows.length - failed,
        failed,
        created,
        updated,
      },
      results,
    };
  }
}
