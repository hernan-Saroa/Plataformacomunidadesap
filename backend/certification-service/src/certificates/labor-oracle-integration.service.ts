import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

type OracleRow = Record<string, unknown>;

type OracleExecuteResult<T extends OracleRow = OracleRow> = {
  rows?: T[];
  metaData?: Array<{ name?: string }>;
};

type OracleConnection = {
  execute<T extends OracleRow = OracleRow>(
    sql: string,
    bindParams?: Record<string, unknown>,
    options?: Record<string, unknown>,
  ): Promise<OracleExecuteResult<T>>;
  close(): Promise<void>;
};

type OracleDriver = {
  OUT_FORMAT_OBJECT: number;
  thin?: boolean;
  initOracleClient?: (config?: { libDir?: string }) => void;
  getConnection(config: {
    user: string;
    password: string;
    connectString: string;
  }): Promise<OracleConnection>;
};

type OracleIntegrationConfig = {
  enabled: boolean;
  user: string;
  password: string;
  connectString: string;
  clientLibDir: string;
  schema: string;
  view: string;
  qualifiedView: string;
};

export type LaborOracleSuggestedRequest = {
  request_number: string | null;
  person_id: string | null;
  full_name: string | null;
  id_number: string | null;
  career_category: string | null;
  hiring_date: string | null;
  position_category: string | null;
  position_category_candidates: string[];
  position_location: string | null;
  monthly_salary: number | null;
  salary_text: string | null;
  cod_cargo: string | null;
  cod_grade: string | null;
  email: string | null;
  personal_email: string | null;
  phone: string | null;
  department: string | null;
  status: string | null;
  observations: string | null;
  request_date: string | null;
  created_at: null;
  updated_at: null;
  source_dates: {
    fecha_creacion: string | null;
    fecha_ingreso: string | null;
    fecha_retiro: string | null;
  };
  source_fields: {
    tipo_vinculacion: string | null;
    tipo_acto_administrativo: string | null;
    dependencia: string | null;
    sucursal: string | null;
    centro_costo: string | null;
  };
  mapping_notes: string[];
};

type LaborOracleMappedRow = {
  raw: OracleRow;
  suggested_certificate_request: LaborOracleSuggestedRequest;
};

@Injectable()
export class LaborOracleIntegrationService {
  private readonly logger = new Logger(LaborOracleIntegrationService.name);
  private oracleClientInitialized = false;

  private normalizeBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    return ['true', '1', 'si', 'yes', 'y'].includes(normalized);
  }

  private normalizeIdentifier(value: string, fieldName: string): string {
    const normalized = String(value || '')
      .trim()
      .toUpperCase();

    if (!normalized) {
      throw new ServiceUnavailableException(
        `No se configuro ORACLE_FNC_${fieldName.toUpperCase()}.`,
      );
    }

    if (!/^[A-Z0-9_$#]+$/.test(normalized)) {
      throw new ServiceUnavailableException(
        `El valor configurado para ORACLE_FNC_${fieldName.toUpperCase()} no es valido.`,
      );
    }

    return normalized;
  }

  private getConfig(): OracleIntegrationConfig {
    const schema = this.normalizeIdentifier(
      process.env.ORACLE_FNC_SCHEMA || 'USRINTEGRACION',
      'schema',
    );
    const view = this.normalizeIdentifier(
      process.env.ORACLE_FNC_VIEW || 'VW_INTEGRACIONFNC',
      'view',
    );

    return {
      enabled: this.normalizeBoolean(process.env.ORACLE_FNC_ENABLED || 'false'),
      user: String(process.env.ORACLE_FNC_USER || '').trim(),
      password: String(process.env.ORACLE_FNC_PASSWORD || ''),
      connectString: String(
        process.env.ORACLE_FNC_CONNECT_STRING ||
          process.env.ORACLE_FNC_CONNECTION_STRING ||
          '',
      ).trim(),
      clientLibDir: String(process.env.ORACLE_CLIENT_LIB_DIR || '').trim(),
      schema,
      view,
      qualifiedView: `${schema}.${view}`,
    };
  }

  private getMissingConfig(config: OracleIntegrationConfig): string[] {
    const missing: string[] = [];

    if (!config.user) missing.push('ORACLE_FNC_USER');
    if (!config.password) missing.push('ORACLE_FNC_PASSWORD');
    if (!config.connectString) missing.push('ORACLE_FNC_CONNECT_STRING');

    return missing;
  }

  private ensureReadyConfig(): OracleIntegrationConfig {
    const config = this.getConfig();

    if (!config.enabled) {
      throw new ServiceUnavailableException(
        'La integracion Oracle FNC esta deshabilitada. Activa ORACLE_FNC_ENABLED=true para usarla.',
      );
    }

    const missing = this.getMissingConfig(config);
    if (missing.length) {
      throw new ServiceUnavailableException(
        `Faltan variables de entorno para Oracle FNC: ${missing.join(', ')}.`,
      );
    }

    return config;
  }

  private loadOracleDriver(): OracleDriver {
    try {
      // Carga perezosa para no afectar el arranque del servicio cuando Oracle no este habilitado.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const driver = require('oracledb') as OracleDriver;
      const clientLibDir = String(process.env.ORACLE_CLIENT_LIB_DIR || '').trim();
      if (clientLibDir && !this.oracleClientInitialized) {
        try {
          driver.initOracleClient?.({ libDir: clientLibDir });
          this.oracleClientInitialized = true;
          this.logger.log(`Oracle Client inicializado en modo Thick desde ${clientLibDir}`);
        } catch (error) {
          const detail = this.extractErrorMessage(error);
          throw new ServiceUnavailableException(
            `No fue posible inicializar Oracle Client con ORACLE_CLIENT_LIB_DIR=${clientLibDir}. Detalle: ${detail}`,
          );
        }
      }
      return driver;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      const detail = this.extractErrorMessage(error);
      throw new ServiceUnavailableException(
        `No fue posible cargar el driver Oracle "oracledb". Instalala en el microservicio antes de probar esta integracion. Detalle: ${detail}`,
      );
    }
  }

  private isInvalidCredentialsError(error: unknown): boolean {
    const candidate = error as { code?: unknown; errorNum?: unknown; message?: unknown };
    const code = String(candidate?.code || '').toUpperCase();
    const message = String(candidate?.message || '').toUpperCase();
    return candidate?.errorNum === 1017 || code === 'ORA-01017' || message.includes('ORA-01017');
  }

  private isConnectStringResolutionError(error: unknown): boolean {
    const candidate = error as { code?: unknown; message?: unknown };
    const code = String(candidate?.code || '').toUpperCase();
    const message = String(candidate?.message || '').toUpperCase();
    return (
      code === 'NJS-530' ||
      message.includes('NJS-530') ||
      message.includes('ORA-12154') ||
      message.includes('ORA-12514') ||
      message.includes('ORA-12545')
    );
  }

  private async withConnection<T>(
    callback: (
      connection: OracleConnection,
      driver: OracleDriver,
      config: OracleIntegrationConfig,
    ) => Promise<T>,
  ): Promise<T> {
    const config = this.ensureReadyConfig();
    const driver = this.loadOracleDriver();
    let connection: OracleConnection;

    try {
      connection = await driver.getConnection({
        user: config.user,
        password: config.password,
        connectString: config.connectString,
      });
    } catch (error) {
      if (this.isInvalidCredentialsError(error)) {
        const mode = driver.thin === false ? 'Thick' : 'Thin';
        throw new ServiceUnavailableException(
          `Oracle rechazo usuario/clave para ${config.user} en ${config.connectString} usando modo ${mode}. ` +
            'Valida que ORACLE_FNC_USER conserve exactamente las mayusculas/minusculas del usuario en Oracle, ' +
            'que ORACLE_FNC_PASSWORD sea la clave real y que ORACLE_FNC_CONNECT_STRING apunte al mismo servicio usado en SQL Developer.',
        );
      }
      if (this.isConnectStringResolutionError(error)) {
        const mode = driver.thin === false ? 'Thick' : 'Thin';
        throw new ServiceUnavailableException(
          `Oracle FNC no pudo resolver o alcanzar el connect string ${config.connectString} usando modo ${mode}. ` +
            'Valida desde el contenedor certification-service que el host del connect string resuelva por DNS y tenga salida al puerto 1521. ' +
            'Ejemplos: docker exec certification-service getent hosts scan-pri.esap.edu.int y docker exec certification-service nc -vz scan-pri.esap.edu.int 1521.',
        );
      }
      throw error;
    }

    try {
      return await callback(connection, driver, config);
    } finally {
      try {
        await connection.close();
      } catch (error) {
        this.logger.warn(
          `No se pudo cerrar la conexion Oracle FNC: ${this.extractErrorMessage(error)}`,
        );
      }
    }
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) {
      return error.message;
    }

    if (typeof error === 'string' && error.trim()) {
      return error.trim();
    }

    return 'Error no identificado';
  }

  private sanitizeDocument(document: string): string {
    const cleaned = String(document || '').trim();
    if (!cleaned) {
      throw new BadRequestException('Debes enviar un numero de documento.');
    }
    return cleaned;
  }

  private normalizeDocument(document: string): string {
    const digits = String(document || '').replace(/\D+/g, '');
    if (digits) return digits;
    return String(document || '')
      .trim()
      .replace(/\s+/g, '')
      .toUpperCase();
  }

  private normalizeLimit(limit?: number): number {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed)) return 5;
    return Math.max(1, Math.min(20, Math.trunc(parsed)));
  }

  private pickValue(row: OracleRow, ...candidates: string[]): unknown {
    const rowEntries = Object.entries(row);
    for (const candidate of candidates) {
      const found = rowEntries.find(
        ([key]) => key.toUpperCase() === String(candidate).trim().toUpperCase(),
      );
      if (found) {
        return found[1];
      }
    }
    return undefined;
  }

  private toText(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text || null;
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null;
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : null;
    }

    const parsed = Number(
      String(value).trim().replace(/\s+/g, '').replace(',', '.'),
    );
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toDateOnly(value: unknown): string | null {
    if (!value) return null;
    if (value instanceof Date) {
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const raw = String(value).trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) {
      return null;
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizeStatus(value: unknown): string | null {
    const raw = this.toText(value)?.toUpperCase();
    if (!raw) return null;
    if (['A', 'ACTIVO', 'ACTIVE', '1'].includes(raw)) return 'A';
    if (['I', 'INACTIVO', 'INACTIVE', '0'].includes(raw)) return 'I';
    return raw;
  }

  private buildCareerCategory(row: OracleRow): string | null {
    const cargo = this.toText(this.pickValue(row, 'CARGO'));
    const grade = this.toText(this.pickValue(row, 'GRADO'));

    if (cargo && grade) {
      return `${cargo} Grado ${grade}`;
    }

    return cargo || null;
  }

  private buildSuggestedRequest(row: OracleRow): LaborOracleSuggestedRequest {
    const tipoVinculacion = this.toText(
      this.pickValue(
        row,
        'TIPO_VINCULACION',
        'TIPOVINCULACION',
        'Tipo_Vinculacion',
      ),
    );
    const tipoActo = this.toText(this.pickValue(row, 'TIPOACTOADMINISTRATIVO'));
    const dependencia = this.toText(this.pickValue(row, 'DEPENDENCIA'));
    const sucursal = this.toText(this.pickValue(row, 'SUCURSAL'));
    const centroCosto = this.toText(
      this.pickValue(
        row,
        'CENTROCOSTO',
        'Codigo_Centro_costo',
        'CODIGO_CENTRO_COSTO',
      ),
    );
    const emailInstitucional = this.toText(this.pickValue(row, 'EMAIL'));
    const emailPersonal = this.toText(this.pickValue(row, 'EMAILPERSONAL'));

    const requestDate = this.toDateOnly(this.pickValue(row, 'FECHA_CREACION'));

    return {
      request_number: null,
      person_id: null,
      full_name: this.toText(this.pickValue(row, 'NOMBRE_COMPLETO')),
      id_number: this.toText(this.pickValue(row, 'CEDULA')),
      career_category: this.buildCareerCategory(row),
      hiring_date: this.toDateOnly(this.pickValue(row, 'FECHA_INGRESO')),
      position_category: tipoActo || tipoVinculacion,
      position_category_candidates: [tipoActo, tipoVinculacion].filter(
        (value): value is string => Boolean(value),
      ),
      position_location: dependencia || sucursal,
      monthly_salary: this.toNumber(this.pickValue(row, 'SUELDO_BASICO')),
      salary_text: null,
      cod_cargo: this.toText(this.pickValue(row, 'COD_CARGO')),
      cod_grade: this.toText(this.pickValue(row, 'GRADO')),
      email: emailInstitucional || emailPersonal,
      personal_email: emailPersonal,
      phone: null,
      department: dependencia || centroCosto || sucursal,
      status: this.normalizeStatus(this.pickValue(row, 'ESTADO')),
      observations: this.toText(this.pickValue(row, 'TIPO')),
      request_date: requestDate,
      created_at: null,
      updated_at: null,
      source_dates: {
        fecha_creacion: requestDate,
        fecha_ingreso: this.toDateOnly(this.pickValue(row, 'FECHA_INGRESO')),
        fecha_retiro: this.toDateOnly(this.pickValue(row, 'FECHA_RETIRO')),
      },
      source_fields: {
        tipo_vinculacion: tipoVinculacion,
        tipo_acto_administrativo: tipoActo,
        dependencia,
        sucursal,
        centro_costo: centroCosto,
      },
      mapping_notes: [
        'career_category se arma como CARGO + " Grado " + GRADO.',
        'position_category usa TIPOACTOADMINISTRATIVO y deja Tipo_Vinculacion como candidato alterno.',
        'position_location y department toman DEPENDENCIA como primera opcion.',
        'request_number y person_id quedan nulos porque la vista Oracle no los expone.',
        'La respuesta expone el mapeo usado para sincronizar certificate_requests cuando el autoservicio consulta el documento.',
      ],
    };
  }

  private mapRow(row: OracleRow): LaborOracleMappedRow {
    return {
      raw: row,
      suggested_certificate_request: this.buildSuggestedRequest(row),
    };
  }

  isEnabled(): boolean {
    return this.getConfig().enabled;
  }

  async getConnectionStatus() {
    const config = this.getConfig();
    const missing = this.getMissingConfig(config);
    let driverInstalled = false;

    if (!config.enabled) {
      return {
        ok: false,
        enabled: false,
        driverInstalled: false,
        connected: false,
        schema: config.schema,
        view: config.view,
        qualifiedView: config.qualifiedView,
        mode: 'disabled',
        message:
          'La integracion Oracle FNC esta deshabilitada. Define ORACLE_FNC_ENABLED=true para probarla.',
      };
    }

    if (missing.length) {
      return {
        ok: false,
        enabled: true,
        driverInstalled: false,
        connected: false,
        schema: config.schema,
        view: config.view,
        qualifiedView: config.qualifiedView,
        mode: 'not-ready',
        missingConfig: missing,
        message: `Faltan variables de entorno para Oracle FNC: ${missing.join(', ')}.`,
      };
    }

    try {
      const driver = this.loadOracleDriver();
      driverInstalled = true;
      const mode = driver.thin === false ? 'thick' : 'thin';
      const clientLibDir = config.clientLibDir || null;
      return await this.withConnection(
        async (connection, readyDriver, readyConfig) => {
          await connection.execute(
            'SELECT 1 AS STATUS FROM DUAL',
            {},
            { outFormat: readyDriver.OUT_FORMAT_OBJECT },
          );

          const result = await connection.execute(
            `SELECT * FROM ${readyConfig.qualifiedView} WHERE ROWNUM <= 1`,
            {},
            { outFormat: readyDriver.OUT_FORMAT_OBJECT },
          );

          const rows = Array.isArray(result.rows) ? result.rows : [];
          const sample = rows[0] || null;

          return {
            ok: true,
            enabled: true,
            driverInstalled: true,
            connected: true,
            mode,
            clientLibDir,
            schema: readyConfig.schema,
            view: readyConfig.view,
            qualifiedView: readyConfig.qualifiedView,
            sampleColumns: sample
              ? Object.keys(sample)
              : (result.metaData || [])
                  .map((item) => item.name || '')
                  .filter(Boolean),
            sampleRow: sample ? this.mapRow(sample) : null,
            message: 'Conexion Oracle FNC exitosa y vista accesible.',
          };
        },
      );
    } catch (error) {
      return {
        ok: false,
        enabled: true,
        driverInstalled,
        connected: false,
        schema: config.schema,
        view: config.view,
        qualifiedView: config.qualifiedView,
        mode: config.clientLibDir ? 'thick' : 'thin',
        clientLibDir: config.clientLibDir || null,
        message: this.extractErrorMessage(error),
      };
    }
  }

  async findByDocument(document: string, limit?: number) {
    const cleanedDocument = this.sanitizeDocument(document);
    const normalizedDocument = this.normalizeDocument(cleanedDocument);
    const safeLimit = this.normalizeLimit(limit);

    return await this.withConnection(async (connection, driver, config) => {
      const result = await connection.execute(
        `SELECT *
           FROM ${config.qualifiedView}
          WHERE (
            TRIM(TO_CHAR(CEDULA)) = :documento
            OR REPLACE(REPLACE(REPLACE(TRIM(TO_CHAR(CEDULA)), '.', ''), '-', ''), ' ', '') = :documentoNormalizado
          )
            AND ROWNUM <= :limite`,
        {
          documento: cleanedDocument,
          documentoNormalizado: normalizedDocument,
          limite: safeLimit,
        },
        { outFormat: driver.OUT_FORMAT_OBJECT },
      );

      const rows = Array.isArray(result.rows) ? result.rows : [];

      return {
        ok: true,
        found: rows.length > 0,
        document: cleanedDocument,
        total: rows.length,
        limit: safeLimit,
        schema: config.schema,
        view: config.view,
        qualifiedView: config.qualifiedView,
        rows: rows.map((row) => this.mapRow(row)),
      };
    });
  }

  async findSuggestedRequestsByDocument(
    document: string,
    limit = 20,
  ): Promise<LaborOracleSuggestedRequest[]> {
    const result = await this.findByDocument(document, limit);
    return result.rows
      .map((row) => row.suggested_certificate_request)
      .filter(Boolean);
  }
}
