import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CertificateRequest } from './certificate-request.entity';
import { LaborFunctionProfile } from './labor-function-profile.entity';
import { LaborFunction } from './labor-function.entity';
import {
  buildLaborFunctionMatchKey,
  findDuplicateLaborFunctions,
  normalizeCombinedPositionCode,
  normalizeGradeCode,
  normalizeLaborFunctionText,
  normalizePositionCode,
  parseLaborFunctions,
  parseLaborFunctionsRaw,
} from './labor-functions.utils';

export type LaborFunctionProfilePayload = {
  positionCode?: string | number;
  position_code?: string | number;
  gradeCode?: string | number;
  grade_code?: string | number;
  combinedCode?: string | number;
  combined_code?: string | number;
  hierarchicalLevel?: string;
  hierarchical_level?: string;
  positionName?: string;
  position_name?: string;
  departmentName?: string;
  department_name?: string;
  internalGroup?: string;
  internal_group?: string;
  costCenter?: string;
  cost_center?: string;
  sourceSheet?: string;
  source_sheet?: string;
  functions?: string[] | string;
  isActive?: boolean;
  is_active?: boolean;
  updatedBy?: string;
  updated_by?: string;
  rowNumber?: number;
};

export type LaborFunctionResolution = {
  available: boolean;
  count: number;
  reason: 'MATCHED' | 'NOT_FOUND' | 'AMBIGUOUS';
  profile: LaborFunctionProfile | null;
  functions: Array<{ ordinal: number; description: string }>;
};

type NormalizedProfilePayload = {
  position_code: string;
  grade_code: string | null;
  combined_code: string;
  match_key: string;
  hierarchical_level: string | null;
  position_name: string;
  department_name: string | null;
  department_key: string | null;
  internal_group: string | null;
  internal_group_key: string | null;
  cost_center: string | null;
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
  ) {}

  private nullableText(value: unknown, maxLength = 500): string | null {
    const text = String(value ?? '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text ? text.slice(0, maxLength) : null;
  }

  private normalizePayload(
    payload: LaborFunctionProfilePayload,
  ): NormalizedProfilePayload {
    const rawPositionCode = String(
      payload.positionCode ?? payload.position_code ?? '',
    ).trim();
    const rawGradeCode = String(
      payload.gradeCode ?? payload.grade_code ?? '',
    ).trim();
    const rawCombinedCode = String(
      payload.combinedCode ?? payload.combined_code ?? '',
    ).trim();
    if (rawPositionCode && !/^\d{1,4}$/.test(rawPositionCode)) {
      throw new BadRequestException(
        'Código debe contener únicamente números y máximo 4 dígitos.',
      );
    }
    if (rawGradeCode && !/^\d{1,3}$/.test(rawGradeCode)) {
      throw new BadRequestException(
        'Grado debe contener únicamente números y máximo 3 dígitos.',
      );
    }
    if (rawCombinedCode && !/^\d{1,20}$/.test(rawCombinedCode)) {
      throw new BadRequestException(
        'cod_cargo debe contener únicamente números.',
      );
    }

    const gradeCode = normalizeGradeCode(
      payload.gradeCode ?? payload.grade_code,
    );
    const combinedInput = payload.combinedCode ?? payload.combined_code;
    const positionInput = payload.positionCode ?? payload.position_code;
    const combinedCode = normalizeCombinedPositionCode(
      combinedInput ?? positionInput,
      gradeCode,
    );

    if (!combinedCode) {
      throw new BadRequestException(
        'Cada registro debe incluir Código o cod_cargo.',
      );
    }

    if (rawPositionCode && rawCombinedCode) {
      const expectedCombinedCode = normalizeCombinedPositionCode(
        rawPositionCode,
        gradeCode,
      );
      if (combinedCode !== expectedCombinedCode) {
        throw new BadRequestException(
          `cod_cargo no coincide con Código + Grado. El valor esperado es ${expectedCombinedCode}.`,
        );
      }
    }

    let positionCode = normalizePositionCode(positionInput);
    if (!positionCode) {
      const base =
        gradeCode && combinedCode.endsWith(gradeCode)
          ? combinedCode.slice(0, -gradeCode.length)
          : combinedCode;
      positionCode = normalizePositionCode(base);
    }

    const positionName = this.nullableText(
      payload.positionName ?? payload.position_name,
      255,
    );
    if (!positionName) {
      throw new BadRequestException(
        'Cada registro debe incluir la Denominación del empleo.',
      );
    }

    if (positionName.length < 3) {
      throw new BadRequestException(
        'La Denominación del empleo debe tener al menos 3 caracteres.',
      );
    }

    const departmentName = this.nullableText(
      payload.departmentName ?? payload.department_name,
    );
    if (!departmentName) {
      throw new BadRequestException(
        'Cada registro debe incluir la Dependencia/Área.',
      );
    }
    const hierarchicalLevel = this.nullableText(
      payload.hierarchicalLevel ?? payload.hierarchical_level,
      100,
    );
    if (!hierarchicalLevel) {
      throw new BadRequestException(
        'Cada registro debe incluir el Nivel Jerárquico.',
      );
    }
    const internalGroup = this.nullableText(
      payload.internalGroup ?? payload.internal_group,
    );
    const costCenter = this.nullableText(
      payload.costCenter ?? payload.cost_center,
      255,
    );
    const rawFunctions = parseLaborFunctionsRaw(payload.functions);
    const functions = parseLaborFunctions(payload.functions);
    const duplicateFunctions = findDuplicateLaborFunctions(rawFunctions);
    if (!functions.length) {
      throw new BadRequestException(
        'No se encontraron funciones válidas. Usa numeración como 1. 2. 3. o una función por línea.',
      );
    }
    if (duplicateFunctions.length) {
      const visibleDuplicates = duplicateFunctions.slice(0, 5);
      const details = visibleDuplicates.map(
        ({ duplicateOrdinal, originalOrdinal, description }) => {
          const preview =
            description.length > 120
              ? `${description.slice(0, 117).trimEnd()}...`
              : description;
          return `la función ${duplicateOrdinal} repite la función ${originalOrdinal}: «${preview}»`;
        },
      );
      const hiddenCount = duplicateFunctions.length - visibleDuplicates.length;
      const hiddenDetail =
        hiddenCount > 0
          ? ` Además, hay ${hiddenCount} repetición${hiddenCount === 1 ? '' : 'es'} más.`
          : '';
      throw new BadRequestException(
        `El registro contiene funciones duplicadas: ${details.join('; ')}.${hiddenDetail} Elimina las repetidas antes de guardar.`,
      );
    }
    if (functions.length > 500) {
      throw new BadRequestException(
        'Cada perfil puede contener máximo 500 funciones.',
      );
    }
    if (functions.some((item) => item.length > 5000)) {
      throw new BadRequestException(
        'Cada función debe tener máximo 5.000 caracteres.',
      );
    }
    if (functions.some((item) => item.length < 8)) {
      throw new BadRequestException(
        'Cada función debe tener al menos 8 caracteres.',
      );
    }

    return {
      position_code: positionCode,
      grade_code: gradeCode,
      combined_code: combinedCode,
      match_key: buildLaborFunctionMatchKey({
        combinedCode,
        hierarchicalLevel:
          payload.hierarchicalLevel ?? payload.hierarchical_level,
        positionName,
        department: departmentName,
        internalGroup,
        costCenter,
      }),
      hierarchical_level: hierarchicalLevel,
      position_name: positionName,
      department_name: departmentName,
      department_key: departmentName
        ? normalizeLaborFunctionText(departmentName)
        : null,
      internal_group: internalGroup,
      internal_group_key: internalGroup
        ? normalizeLaborFunctionText(internalGroup)
        : null,
      cost_center: costCenter,
      source_sheet: this.nullableText(
        payload.sourceSheet ?? payload.source_sheet,
        255,
      ),
      is_active: payload.isActive ?? payload.is_active ?? true,
      updated_by: this.nullableText(
        payload.updatedBy ?? payload.updated_by,
        255,
      ),
      functions,
    };
  }

  private serializeProfile(
    profile: LaborFunctionProfile,
    associationCount = 0,
  ) {
    const functions = [...(profile.functions || [])]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((item) => ({
        id: item.id,
        ordinal: item.ordinal,
        description: item.description,
      }));
    return {
      ...profile,
      functions,
      function_count: functions.length,
      association_count: associationCount,
    };
  }

  private isSpecificMatrixValue(value?: string | null) {
    const normalized = normalizeLaborFunctionText(value);
    return Boolean(
      normalized &&
        !['n a', 'na', 'no aplica', 'no aplica ninguno', 'ninguno'].includes(
          normalized,
        ),
    );
  }

  private exactEquivalent(expected?: string | null, ...actual: Array<string | null | undefined>) {
    if (!this.isSpecificMatrixValue(expected)) return true;
    const expectedKey = normalizeLaborFunctionText(expected);
    return actual.some(
      (value) =>
        this.isSpecificMatrixValue(value) &&
        normalizeLaborFunctionText(value) === expectedKey,
    );
  }

  private normalizePositionNameForMatch(value?: string | null) {
    return normalizeLaborFunctionText(value)
      .replace(/\s+grado\s+\d+$/, '')
      .trim();
  }

  private inferHierarchicalLevel(positionName?: string | null) {
    const value = this.normalizePositionNameForMatch(positionName);
    if (!value) return null;
    if (/\b(director|directivo|jefe de oficina)\b/.test(value)) return 'directivo';
    if (/\basesor\b/.test(value)) return 'asesor';
    if (/\bprofesional\b/.test(value)) return 'profesional';
    if (/\btecnico\b/.test(value)) return 'tecnico';
    if (/\b(asistencial|secretari|conductor|auxiliar|operario)\b/.test(value)) {
      return 'asistencial';
    }
    return null;
  }

  private profileMatchesRequest(
    profile: LaborFunctionProfile,
    request: Pick<
      CertificateRequest,
      | 'cod_cargo'
      | 'cod_grade'
      | 'base_position_code'
      | 'hierarchical_level'
      | 'position_name'
      | 'organization_department'
      | 'internal_group'
      | 'cost_center'
      | 'department'
      | 'position_location'
      | 'career_category'
    >,
  ) {
    const requestCombined = normalizeCombinedPositionCode(
      request.cod_cargo,
      request.cod_grade,
    );
    if (profile.combined_code !== requestCombined) return false;

    const requestGrade = normalizeGradeCode(request.cod_grade);
    const requestBase = normalizePositionCode(
      request.base_position_code ||
        (requestGrade && requestCombined.endsWith(requestGrade)
          ? requestCombined.slice(0, -requestGrade.length)
          : request.cod_cargo),
    );
    if (profile.position_code !== requestBase) return false;
    if (normalizeGradeCode(profile.grade_code) !== normalizeGradeCode(request.cod_grade)) {
      return false;
    }

    const expectedPosition = this.normalizePositionNameForMatch(
      profile.position_name,
    );
    const requestPositionName = this.normalizePositionNameForMatch(
      request.position_name || request.career_category,
    );
    if (!requestPositionName || requestPositionName !== expectedPosition) {
      return false;
    }

    if (
      !this.exactEquivalent(
        profile.department_name,
        request.organization_department,
        request.department,
        request.position_location,
      )
    ) {
      return false;
    }
    if (
      !this.exactEquivalent(
        profile.hierarchical_level,
        request.hierarchical_level ||
          this.inferHierarchicalLevel(
            request.position_name || request.career_category,
          ),
      )
    ) {
      return false;
    }
    if (
      !this.exactEquivalent(
        profile.internal_group,
        request.internal_group,
        request.position_location,
      )
    ) {
      return false;
    }
    if (!this.exactEquivalent(profile.cost_center, request.cost_center)) {
      return false;
    }
    return true;
  }

  private resolveFromProfiles(
    request: Pick<
      CertificateRequest,
      | 'cod_cargo'
      | 'cod_grade'
      | 'base_position_code'
      | 'hierarchical_level'
      | 'position_name'
      | 'organization_department'
      | 'internal_group'
      | 'cost_center'
      | 'department'
      | 'position_location'
      | 'career_category'
    >,
    profiles: LaborFunctionProfile[],
  ): LaborFunctionResolution {
    const combinedCode = normalizeCombinedPositionCode(
      request.cod_cargo,
      request.cod_grade,
    );
    const candidates = profiles.filter(
      (profile) =>
        profile.is_active &&
        profile.combined_code === combinedCode &&
        this.profileMatchesRequest(profile, request),
    );
    if (!candidates.length) {
      return {
        available: false,
        count: 0,
        reason: 'NOT_FOUND',
        profile: null,
        functions: [],
      };
    }

    const top = candidates[0];
    if (candidates.length > 1) {
      const signatures = new Set(
        candidates.map((profile) =>
          (profile.functions || [])
            .slice()
            .sort((a, b) => a.ordinal - b.ordinal)
            .map((fn) => normalizeLaborFunctionText(fn.description))
            .join('|'),
        ),
      );
      if (signatures.size > 1) {
        return {
          available: false,
          count: 0,
          reason: 'AMBIGUOUS',
          profile: null,
          functions: [],
        };
      }
    }

    const functions = [...(top.functions || [])]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((item) => ({
        ordinal: item.ordinal,
        description: item.description,
      }));
    return {
      available: functions.length > 0,
      count: functions.length,
      reason: functions.length ? 'MATCHED' : 'NOT_FOUND',
      profile: top,
      functions,
    };
  }

  async resolveForRequest(
    request: Pick<
      CertificateRequest,
      | 'cod_cargo'
      | 'cod_grade'
      | 'base_position_code'
      | 'hierarchical_level'
      | 'position_name'
      | 'organization_department'
      | 'internal_group'
      | 'cost_center'
      | 'department'
      | 'position_location'
      | 'career_category'
    >,
  ): Promise<LaborFunctionResolution> {
    const combinedCode = normalizeCombinedPositionCode(
      request.cod_cargo,
      request.cod_grade,
    );
    if (!combinedCode) {
      return {
        available: false,
        count: 0,
        reason: 'NOT_FOUND',
        profile: null,
        functions: [],
      };
    }
    const profiles = await this.profileRepo.find({
      where: { combined_code: combinedCode, is_active: true },
      relations: ['functions'],
    });
    return this.resolveFromProfiles(request, profiles);
  }

  async list(options: { search?: string; page?: number; limit?: number } = {}) {
    const search = normalizeLaborFunctionText(options.search);
    const requestedPage = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 20));
    const allProfiles = await this.profileRepo.find({
      relations: ['functions'],
      order: { position_code: 'ASC', grade_code: 'ASC', department_name: 'ASC' },
    });
    const filtered = search
      ? allProfiles.filter((profile) =>
          normalizeLaborFunctionText(
            [
              profile.position_code,
              profile.grade_code,
              profile.combined_code,
              profile.position_name,
              profile.department_name,
              profile.internal_group,
            ].join(' '),
          ).includes(search),
        )
      : allProfiles;

    const associationCounts = new Map<string, number>();
    if (allProfiles.length) {
      const profilesByCombinedCode = new Map<string, LaborFunctionProfile[]>();
      allProfiles.forEach((profile) => {
        const bucket = profilesByCombinedCode.get(profile.combined_code) || [];
        bucket.push(profile);
        profilesByCombinedCode.set(profile.combined_code, bucket);
      });
      const requests = await this.requestRepo.find({
        select: {
          id: true,
          cod_cargo: true,
          cod_grade: true,
          base_position_code: true,
          hierarchical_level: true,
          position_name: true,
          organization_department: true,
          internal_group: true,
          cost_center: true,
          department: true,
          position_location: true,
          career_category: true,
        },
      });
      requests.forEach((request) => {
        const combinedCode = normalizeCombinedPositionCode(
          request.cod_cargo,
          request.cod_grade,
        );
        const resolution = this.resolveFromProfiles(
          request,
          profilesByCombinedCode.get(combinedCode) || [],
        );
        const profileId = resolution.profile?.id;
        if (resolution.available && profileId) {
          associationCounts.set(
            profileId,
            (associationCounts.get(profileId) || 0) + 1,
          );
        }
      });
    }

    const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
    const page = Math.min(requestedPage, totalPages);
    const start = (page - 1) * limit;
    return {
      items: filtered
        .slice(start, start + limit)
        .map((profile) =>
          this.serializeProfile(profile, associationCounts.get(profile.id) || 0),
        ),
      total: filtered.length,
      page,
      limit,
      totalPages,
      stats: {
        profiles: allProfiles.length,
        functions: allProfiles.reduce(
          (sum, profile) => sum + (profile.functions?.length || 0),
          0,
        ),
        associatedRequests: Array.from(associationCounts.values()).reduce(
          (sum, count) => sum + count,
          0,
        ),
      },
    };
  }

  async findOne(id: string) {
    const profile = await this.profileRepo.findOne({
      where: { id },
      relations: ['functions'],
    });
    if (!profile) {
      throw new NotFoundException('Registro de funciones no encontrado.');
    }
    return this.serializeProfile(profile);
  }

  private async persist(
    normalized: NormalizedProfilePayload,
    id?: string,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const profiles = manager.getRepository(LaborFunctionProfile);
      const functions = manager.getRepository(LaborFunction);
      let profile: LaborFunctionProfile | null = null;
      let action: 'created' | 'updated' = 'created';

      if (id) {
        profile = await profiles.findOne({ where: { id } });
        if (!profile) {
          throw new NotFoundException('Registro de funciones no encontrado.');
        }
        action = 'updated';
      }

      const duplicate = await profiles.findOne({
        where: { match_key: normalized.match_key },
      });
      if (duplicate && duplicate.id !== profile?.id) {
        throw new ConflictException(
          'Ya existe un registro con el mismo código, dependencia, grupo y centro de costo.',
        );
      }

      const { functions: descriptions, ...profileData } = normalized;
      profile = profiles.create({
        ...(profile || {}),
        ...profileData,
        created_by: profile?.created_by || normalized.updated_by,
      });
      profile = await profiles.save(profile);
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
      return { ...this.serializeProfile(saved), action };
    });
  }

  async create(payload: LaborFunctionProfilePayload) {
    return await this.persist(this.normalizePayload(payload));
  }

  async update(id: string, payload: LaborFunctionProfilePayload) {
    return await this.persist(this.normalizePayload(payload), id);
  }

  async remove(id: string) {
    const profile = await this.profileRepo.findOne({ where: { id } });
    if (!profile) {
      throw new NotFoundException('Registro de funciones no encontrado.');
    }
    await this.profileRepo.remove(profile);
    return { id, deleted: true };
  }

  private assertBulkSize(rows: LaborFunctionProfilePayload[]) {
    if (!Array.isArray(rows) || !rows.length) {
      throw new BadRequestException('La carga masiva no contiene filas.');
    }
    if (rows.length > 5000) {
      throw new BadRequestException('La carga masiva permite máximo 5.000 filas.');
    }
  }

  async validateBulk(
    rows: LaborFunctionProfilePayload[],
    updatedBy?: string,
    sourceSheet = 'Matriz Funciones ESAP',
  ) {
    this.assertBulkSize(rows);
    const existingProfiles = await this.profileRepo.find({
      select: { id: true, match_key: true },
    });
    const existingKeys = new Set(existingProfiles.map((profile) => profile.match_key));
    const seenKeys = new Map<
      string,
      { rowNumber: number; functionSignature: string }
    >();
    const results = rows.map((row, index) => {
      const rowNumber = Number(row.rowNumber) || index + 1;
      try {
        const normalized = this.normalizePayload({
          ...row,
          sourceSheet: row.sourceSheet || row.source_sheet || sourceSheet,
          updatedBy: row.updatedBy || row.updated_by || updatedBy,
        });
        const functionSignature = normalized.functions
          .map(normalizeLaborFunctionText)
          .join('|');
        const duplicate = seenKeys.get(normalized.match_key);
        if (duplicate) {
          const exactDuplicate =
            duplicate.functionSignature === functionSignature;
          return {
            rowNumber,
            status: 'error' as const,
            action: null,
            combined_code: normalized.combined_code,
            function_count: normalized.functions.length,
            message: exactDuplicate
              ? `Esta fila es idéntica a la fila ${duplicate.rowNumber}: repite el mismo cargo, ubicación y funciones. Se omitirá para evitar guardar el perfil dos veces.`
              : `Esta fila repite el mismo cargo y ubicación de la fila ${duplicate.rowNumber}, pero contiene funciones diferentes. Unifica todas las funciones en una sola fila o completa el grupo o centro de costo que las diferencia.`,
          };
        }
        seenKeys.set(normalized.match_key, { rowNumber, functionSignature });
        if (existingKeys.has(normalized.match_key)) {
          return {
            rowNumber,
            status: 'error' as const,
            action: null,
            combined_code: normalized.combined_code,
            function_count: normalized.functions.length,
            message:
              'La combinación institucional ya existe en la matriz. No se permiten registros duplicados; edítala desde la vista principal si necesitas cambiar sus funciones.',
          };
        }
        return {
          rowNumber,
          status: 'valid' as const,
          action: 'created' as const,
          combined_code: normalized.combined_code,
          function_count: normalized.functions.length,
          message: 'Fila válida; se creará un perfil nuevo.',
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
      const rowNumber = Number(row.rowNumber) || index + 1;
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
          combined_code: saved.combined_code,
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
