import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, In, Repository } from 'typeorm';
import { CertificateRequest } from './certificate-request.entity';
import {
  LaborOracleIntegrationService,
  type LaborOracleSuggestedRequest,
} from './labor-oracle-integration.service';
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
  resolveLaborInternalGroup,
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

/**
 * Campos minimos que necesita el cruce contra un perfil de funciones. Los
 * cumplen tanto las filas locales (`certificate_request`) como las de Oracle
 * (`LaborOracleSuggestedRequest`), de modo que ambas fuentes pasan por la MISMA
 * funcion de resolucion y no pueden dar resultados distintos.
 */
export type LaborMatchableRequest = {
  cod_cargo?: string | null;
  cod_grade?: string | null;
  base_position_code?: string | null;
  hierarchical_level?: string | null;
  position_name?: string | null;
  organization_department?: string | null;
  internal_group?: string | null;
  cost_center?: string | null;
  department?: string | null;
  position_location?: string | null;
  career_category?: string | null;
  id_number?: string | null;
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
    private readonly laborOracleIntegrationService: LaborOracleIntegrationService,
  ) {}

  private readonly logger = new Logger(LaborFunctionsService.name);

  /**
   * Cache corta de las vinculaciones traidas de Oracle. La matriz consulta los
   * mismos cod_cargo en cada paginacion y al abrir cada modal de asociados; sin
   * cache eso serian varias consultas por minuto contra la vista.
   */
  private oracleCache: {
    key: string;
    expiresAt: number;
    rows: LaborOracleSuggestedRequest[];
  } | null = null;

  private static readonly ORACLE_CACHE_TTL_MS = 60_000;

  /**
   * Vinculaciones de Oracle para los cod_cargo indicados.
   *
   * Es best-effort a proposito: si la integracion esta apagada, mal configurada
   * o la vista falla, se devuelve una lista vacia y la matriz sigue funcionando
   * exactamente como antes con los datos locales. Nunca propaga el error.
   */
  private async loadOracleRequests(
    combinedCodes: string[],
  ): Promise<{ rows: LaborOracleSuggestedRequest[]; available: boolean }> {
    if (!this.laborOracleIntegrationService?.isEnabled?.()) {
      return { rows: [], available: false };
    }

    const codes = Array.from(
      new Set(
        (combinedCodes || [])
          .map((code) => String(code ?? '').replace(/\D+/g, ''))
          .filter(Boolean),
      ),
    ).sort();
    if (!codes.length) return { rows: [], available: true };

    const key = codes.join(',');
    const now = Date.now();
    if (
      this.oracleCache &&
      this.oracleCache.key === key &&
      this.oracleCache.expiresAt > now
    ) {
      return { rows: this.oracleCache.rows, available: true };
    }

    try {
      const rows =
        await this.laborOracleIntegrationService.findSuggestedRequestsByPositionCodes(
          codes,
        );
      this.oracleCache = {
        key,
        expiresAt: now + LaborFunctionsService.ORACLE_CACHE_TTL_MS,
        rows,
      };
      return { rows, available: true };
    } catch (error: any) {
      this.logger.warn(
        `No se pudieron consultar las vinculaciones en Oracle FNC para la matriz de funciones: ${
          error?.message || error
        }. Se continua solo con los datos locales.`,
      );
      return { rows: [], available: false };
    }
  }

  /** Identidad de una persona dentro de un cargo, para no contarla dos veces
   *  cuando aparece en la tabla local y en Oracle a la vez. */
  private associationIdentity(request: LaborMatchableRequest): string {
    const documento = normalizeLaborFunctionText(request.id_number).replace(
      /\s+/g,
      '',
    );
    const cargo = normalizeCombinedPositionCode(
      request.cod_cargo,
      request.cod_grade,
    );
    return `${documento}|${cargo}`;
  }

  /**
   * Funciones repetidas descartadas dentro de una misma fila. No es un
   * error: se informa en el reporte de la carga masiva para que quede
   * explícito que el perfil se guardó con menos funciones de las que traía
   * el archivo.
   */
  private duplicateFunctionCount(value: unknown): number {
    return findDuplicateLaborFunctions(parseLaborFunctionsRaw(value)).length;
  }

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
    const internalGroup = resolveLaborInternalGroup(
      payload.internalGroup ?? payload.internal_group,
      payload.costCenter ?? payload.cost_center,
    );
    if (internalGroup && internalGroup.length > 500) {
      throw new BadRequestException(
        'Grupo interno debe tener máximo 500 caracteres.',
      );
    }
    const functions = parseLaborFunctions(payload.functions);
    if (!functions.length) {
      throw new BadRequestException(
        'No se encontraron funciones válidas. Usa numeración como 1. 2. 3. o una función por línea.',
      );
    }
    // Las funciones repetidas DENTRO de una misma fila ya no rechazan el
    // registro: `parseLaborFunctions` deduplica, así que el perfil se guarda con
    // la lista única y no se pierde información. La única duplicidad que sigue
    // siendo un error es la de fila contra fila (misma identidad institucional),
    // que se evalúa por match_key en validateBulk/bulk.
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
      cost_center: null,
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
    const { cost_center: legacyCostCenter, ...visibleProfile } = profile;
    const internalGroup = resolveLaborInternalGroup(
      profile.internal_group,
      legacyCostCenter,
    );
    const functions = [...(profile.functions || [])]
      .sort((a, b) => a.ordinal - b.ordinal)
      .map((item) => ({
        id: item.id,
        ordinal: item.ordinal,
        description: item.description,
      }));
    return {
      ...visibleProfile,
      internal_group: internalGroup,
      internal_group_key: normalizeLaborFunctionText(internalGroup) || null,
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
    request: LaborMatchableRequest,
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
        resolveLaborInternalGroup(profile.internal_group, profile.cost_center),
        resolveLaborInternalGroup(
          request.internal_group,
          request.cost_center,
          request.position_location,
        ),
      )
    ) {
      return false;
    }
    return true;
  }

  private resolveFromProfiles(
    request: LaborMatchableRequest,
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
      profile: {
        ...top,
        internal_group: resolveLaborInternalGroup(top.internal_group, top.cost_center),
      },
      functions,
    };
  }

  async resolveForRequest(
    request: LaborMatchableRequest,
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
      order: {
        created_at: 'DESC',
        position_code: 'ASC',
        grade_code: 'ASC',
        department_name: 'ASC',
      },
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
              resolveLaborInternalGroup(profile.internal_group, profile.cost_center),
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
          id_number: true,
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

      // En los ambientes donde los empleados llegan por Oracle, la tabla local
      // solo tiene a quienes ya pasaron por el autoservicio. Se completa el
      // universo con la vista para que el contador no quede en cero.
      const oracle = await this.loadOracleRequests(
        Array.from(profilesByCombinedCode.keys()),
      );

      const seenIdentities = new Set<string>();
      const countable: LaborMatchableRequest[] = [];
      requests.forEach((request) => {
        seenIdentities.add(this.associationIdentity(request));
        countable.push(request);
      });
      oracle.rows.forEach((row) => {
        const identity = this.associationIdentity(row);
        // La misma persona puede estar en las dos fuentes: la local manda.
        if (seenIdentities.has(identity)) return;
        seenIdentities.add(identity);
        countable.push(row);
      });

      countable.forEach((request) => {
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

  /**
   * Listado detallado de las solicitudes (contratos) que resuelven exactamente
   * contra un perfil de funciones. Reutiliza `resolveFromProfiles`, la misma
   * lógica que alimenta el contador `association_count` de `list()`, para que el
   * número del badge y el contenido del listado nunca se contradigan.
   */
  async listAssociations(
    id: string,
    options: { search?: string; page?: number; limit?: number } = {},
  ) {
    const profile = await this.profileRepo.findOne({
      where: { id },
      relations: ['functions'],
    });
    if (!profile) {
      throw new NotFoundException('Registro de funciones no encontrado.');
    }

    const requestedPage = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(options.limit) || 25));
    const search = normalizeLaborFunctionText(options.search);

    // La resolución necesita los perfiles hermanos con el mismo cod_cargo para
    // poder declarar ambigüedad igual que lo hace el contador.
    const siblings = await this.profileRepo.find({
      where: { combined_code: profile.combined_code },
      relations: ['functions'],
    });

    const requests = await this.requestRepo.find({
      select: {
        id: true,
        request_number: true,
        full_name: true,
        id_number: true,
        document_type: true,
        email: true,
        campus: true,
        status: true,
        hiring_date: true,
        request_date: true,
        created_at: true,
        cod_cargo: true,
        cod_grade: true,
        base_position_code: true,
        hierarchical_level: true,
        position_name: true,
        position_category: true,
        organization_department: true,
        internal_group: true,
        cost_center: true,
        department: true,
        position_location: true,
        career_category: true,
      },
      order: { created_at: 'DESC' },
    });

    const oracle = await this.loadOracleRequests([profile.combined_code]);

    const serialize = (
      request: any,
      origen: 'local' | 'oracle',
    ) => ({
      id: request.id || `oracle:${this.associationIdentity(request)}`,
      origen,
      request_number: request.request_number || null,
      full_name: request.full_name,
      id_number: request.id_number,
      document_type: request.document_type || null,
      email: request.email || null,
      campus: request.campus || null,
      status: request.status || null,
      position_name: request.position_name || request.career_category || null,
      position_category: request.position_category || null,
      hierarchical_level: request.hierarchical_level || null,
      combined_code: normalizeCombinedPositionCode(
        request.cod_cargo,
        request.cod_grade,
      ),
      department_name:
        request.organization_department || request.department || null,
      internal_group:
        resolveLaborInternalGroup(
          request.internal_group,
          request.cost_center,
          request.position_location,
        ) || null,
      hiring_date: request.hiring_date || null,
      request_date: request.request_date || null,
      created_at: request.created_at || null,
    });

    const matches = (request: LaborMatchableRequest) => {
      const resolution = this.resolveFromProfiles(request, siblings);
      return resolution.available && resolution.profile?.id === profile.id;
    };

    const serialized: Array<ReturnType<typeof serialize>> = [];
    const seenIdentities = new Set<string>();

    requests.filter(matches).forEach((request) => {
      seenIdentities.add(this.associationIdentity(request));
      serialized.push(serialize(request, 'local'));
    });
    oracle.rows.filter(matches).forEach((row) => {
      const identity = this.associationIdentity(row);
      // La misma persona puede venir de las dos fuentes: la local manda porque
      // trae numero de solicitud y estado reales.
      if (seenIdentities.has(identity)) return;
      seenIdentities.add(identity);
      serialized.push(serialize(row, 'oracle'));
    });

    const filtered = search
      ? serialized.filter((item) =>
          normalizeLaborFunctionText(
            [
              item.full_name,
              item.id_number,
              item.request_number,
              item.email,
              item.department_name,
              item.internal_group,
              item.campus,
            ].join(' '),
          ).includes(search),
        )
      : serialized;

    const statusCounts: Record<string, number> = {};
    serialized.forEach((item) => {
      const key = item.status || 'SIN_ESTADO';
      statusCounts[key] = (statusCounts[key] || 0) + 1;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
    const page = Math.min(requestedPage, totalPages);
    const start = (page - 1) * limit;

    return {
      profile: {
        id: profile.id,
        combined_code: profile.combined_code,
        position_code: profile.position_code,
        grade_code: profile.grade_code,
        position_name: profile.position_name,
        hierarchical_level: profile.hierarchical_level,
        department_name: profile.department_name,
        internal_group: resolveLaborInternalGroup(
          profile.internal_group,
          profile.cost_center,
        ),
        function_count: profile.functions?.length || 0,
      },
      items: filtered.slice(start, start + limit),
      total: filtered.length,
      page,
      limit,
      totalPages,
      summary: {
        associations: serialized.length,
        uniquePeople: new Set(
          serialized.map(
            (item) => normalizeLaborFunctionText(item.id_number) || item.id,
          ),
        ).size,
        byStatus: statusCounts,
        fromLocal: serialized.filter((item) => item.origen === 'local').length,
        fromOracle: serialized.filter((item) => item.origen === 'oracle').length,
        oracleAvailable: oracle.available,
      },
    };
  }

  /**
   * Consulta informativa de un empleado: con qué datos EXACTOS hay que crearle
   * el perfil de funciones.
   *
   * Devuelve UNA sola vinculación por persona: la que el certificado realmente
   * usa. La elige `selectPreferred`, que el controlador enlaza con la misma
   * selección de CertificatesService (activos → encargo vigente → carrera
   * administrativa → más reciente), para que no existan dos criterios
   * distintos de "cuál vinculación vale".
   *
   * No crea ni modifica nada.
   */
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
          row: elegida,
          vinculaciones: rows.length,
        };
      },
    );

    const combinedCodes = Array.from(
      new Set(
        seleccionadas
          .map(({ row }) =>
            normalizeCombinedPositionCode(row.cod_cargo, row.cod_grade),
          )
          .filter(Boolean),
      ),
    );
    const profiles = combinedCodes.length
      ? await this.profileRepo.find({
          where: { combined_code: In(combinedCodes) },
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
    });

    const items = seleccionadas
      .slice(0, limit)
      .map(({ row, origen, vinculaciones }) => {
        const combinedCode = normalizeCombinedPositionCode(
          row.cod_cargo,
          row.cod_grade,
        );
        const mismoCargo = profiles.filter(
          (profile) => profile.combined_code === combinedCode,
        );
        const resolution = this.resolveFromProfiles(row, mismoCargo);
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
          /** Cuántas vinculaciones tiene la persona; se muestra solo esta. */
          total_vinculaciones: vinculaciones,
          matrix,
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

      // Recompute legacy keys in memory so existing rows remain protected from
      // duplicates without rewriting or merging their functions during deployment.
      const candidates = await profiles.find({
        where: { combined_code: normalized.combined_code },
      });
      const duplicate = candidates.find(
        (candidate) => candidate.id !== profile?.id &&
          this.profileMatchKey(candidate) === normalized.match_key,
      );
      if (duplicate) {
        throw new ConflictException(
          'Ya existe un registro con el mismo código, dependencia y grupo interno.',
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
      throw new BadRequestException('La carga masiva permite máximo 5.000 filas.');
    }
  }

  private profileMatchKey(profile: LaborFunctionProfile): string {
    return buildLaborFunctionMatchKey({
      combinedCode: profile.combined_code,
      hierarchicalLevel: profile.hierarchical_level,
      positionName: profile.position_name,
      department: profile.department_name,
      internalGroup: profile.internal_group,
      costCenter: profile.cost_center,
    });
  }

  async validateBulk(
    rows: LaborFunctionProfilePayload[],
    updatedBy?: string,
    sourceSheet = 'Matriz Funciones ESAP',
  ) {
    this.assertBulkSize(rows);
    const existingProfiles = await this.profileRepo.find({
      select: {
        combined_code: true,
        hierarchical_level: true,
        position_name: true,
        department_name: true,
        internal_group: true,
        cost_center: true,
      },
    });
    const existingKeys = new Set(
      existingProfiles.map((profile) => this.profileMatchKey(profile)),
    );
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
              : `Esta fila repite el mismo cargo y ubicación de la fila ${duplicate.rowNumber}, pero contiene funciones diferentes. Unifica todas las funciones en una sola fila o completa el grupo interno que las diferencia.`,
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
        const omitidas = this.duplicateFunctionCount(row.functions);
        return {
          rowNumber,
          status: 'valid' as const,
          action: 'created' as const,
          combined_code: normalized.combined_code,
          function_count: normalized.functions.length,
          message: omitidas
            ? `Fila válida; se creará un perfil nuevo. Se omitieron ${omitidas} función${omitidas === 1 ? '' : 'es'} repetida${omitidas === 1 ? '' : 's'} dentro de la fila.`
            : 'Fila válida; se creará un perfil nuevo.',
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
