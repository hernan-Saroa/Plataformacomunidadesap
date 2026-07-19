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

type OracleGraduateConfig = {
  enabled: boolean;
  user: string;
  password: string;
  connectString: string;
  clientLibDir: string;
  schema: string;
  view: string;
  qualifiedView: string;
};

export type OracleGraduateRecord = {
  idNumber: string | null;
  firstName: string | null;
  lastName: string | null;
  fullName: string | null;
  email: string | null;
  personalEmail: string | null;
  phone: string | null;
  programCode: string | null;
  programName: string | null;
  programType: string | null;
  degreeTitle: string | null;
  territorial: string | null;
  campus: string | null;
  numLibro: string | null;
  numFolio: string | null;
  numRegistro: string | null;
  diplomaNumber: string | null;
  graduationDate: string | null;
  numActa: string | null;
};

@Injectable()
export class GraduateOracleIntegrationService {
  private readonly logger = new Logger(GraduateOracleIntegrationService.name);
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
        `No se configuro ORACLE_GRAD_${fieldName.toUpperCase()}.`,
      );
    }

    if (!/^[A-Z0-9_$#]+$/.test(normalized)) {
      throw new ServiceUnavailableException(
        `El valor configurado para ORACLE_GRAD_${fieldName.toUpperCase()} no es válido.`,
      );
    }

    return normalized;
  }

  private getConfig(): OracleGraduateConfig {
    const schema = this.normalizeIdentifier(
      process.env.ORACLE_GRAD_SCHEMA || 'USRINTEGRACION',
      'schema',
    );
    const view = this.normalizeIdentifier(
      process.env.ORACLE_GRAD_VIEW || 'VW_INTEGRACIONCERTIFICADO',
      'view',
    );

    return {
      enabled: this.normalizeBoolean(
        process.env.ORACLE_GRAD_ENABLED || 'false',
      ),
      user: String(process.env.ORACLE_GRAD_USER || '').trim(),
      password: String(process.env.ORACLE_GRAD_PASSWORD || ''),
      connectString: String(
        process.env.ORACLE_GRAD_CONNECT_STRING ||
          process.env.ORACLE_GRAD_CONNECTION_STRING ||
          '',
      ).trim(),
      clientLibDir: String(
        process.env.ORACLE_GRAD_CLIENT_LIB_DIR ||
          process.env.ORACLE_CLIENT_LIB_DIR ||
          '',
      ).trim(),
      schema,
      view,
      qualifiedView: `${schema}.${view}`,
    };
  }

  private getMissingConfig(config: OracleGraduateConfig): string[] {
    const missing: string[] = [];

    if (!config.user) missing.push('ORACLE_GRAD_USER');
    if (!config.password) missing.push('ORACLE_GRAD_PASSWORD');
    if (!config.connectString) missing.push('ORACLE_GRAD_CONNECT_STRING');

    return missing;
  }

  isEnabled(): boolean {
    return this.getConfig().enabled;
  }

  private ensureReadyConfig(): OracleGraduateConfig {
    const config = this.getConfig();

    if (!config.enabled) {
      throw new ServiceUnavailableException(
        'La integración Oracle SINU está deshabilitada. Active ORACLE_GRAD_ENABLED=true para utilizarla.',
      );
    }

    const missing = this.getMissingConfig(config);
    if (missing.length) {
      throw new ServiceUnavailableException(
        `Faltan variables de entorno para Oracle SINU: ${missing.join(', ')}.`,
      );
    }

    return config;
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

  private loadOracleDriver(): OracleDriver {
    try {
      // Carga perezosa para que el servicio arranque cuando Oracle no este habilitado.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const driver = require('oracledb') as OracleDriver;
      const clientLibDir = this.getConfig().clientLibDir;
      if (clientLibDir && !this.oracleClientInitialized) {
        try {
          driver.initOracleClient?.({ libDir: clientLibDir });
          this.oracleClientInitialized = true;
          this.logger.log(
            `Oracle Client SINU inicializado en modo Thick desde ${clientLibDir}`,
          );
        } catch (error) {
          throw new ServiceUnavailableException(
            `No fue posible inicializar Oracle Client con ORACLE_GRAD_CLIENT_LIB_DIR=${clientLibDir}. Detalle: ${this.extractErrorMessage(error)}`,
          );
        }
      }
      return driver;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }
      throw new ServiceUnavailableException(
        `No fue posible cargar el driver Oracle "oracledb" en academic-registration-service. Detalle: ${this.extractErrorMessage(error)}`,
      );
    }
  }

  private isInvalidCredentialsError(error: unknown): boolean {
    const candidate = error as {
      code?: unknown;
      errorNum?: unknown;
      message?: unknown;
    };
    const code = String(candidate?.code || '').toUpperCase();
    const message = String(candidate?.message || '').toUpperCase();
    return (
      candidate?.errorNum === 1017 ||
      code === 'ORA-01017' ||
      message.includes('ORA-01017')
    );
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
      config: OracleGraduateConfig,
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
          `Oracle SINU rechazo usuario/clave para ${config.user} en ${config.connectString} usando modo ${mode}.`,
        );
      }
      if (this.isConnectStringResolutionError(error)) {
        const mode = driver.thin === false ? 'Thick' : 'Thin';
        throw new ServiceUnavailableException(
          `Oracle SINU no pudo resolver o alcanzar el connect string ${config.connectString} usando modo ${mode}. ` +
            'Valide desde el contenedor academic-registration-service que el host del connect string resuelva por DNS y tenga salida al puerto 1521. ' +
            'Ejemplos: docker exec academic-registration-service getent hosts scan-pri.esap.edu.int y docker exec academic-registration-service nc -vz scan-pri.esap.edu.int 1521.',
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
          `No se pudo cerrar la conexión Oracle SINU: ${this.extractErrorMessage(error)}`,
        );
      }
    }
  }

  private sanitizeDocument(document: string): string {
    const cleaned = String(document || '').trim();
    if (!cleaned) {
      throw new BadRequestException('Debe enviar un número de documento.');
    }
    return cleaned;
  }

  private normalizeDocument(document: string): string {
    return String(document || '')
      .trim()
      .replace(/[^A-Za-z0-9]+/g, '')
      .toUpperCase();
  }

  private normalizeLimit(limit?: number): number {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed)) return 20;
    return Math.max(1, Math.min(100, Math.trunc(parsed)));
  }

  private pickValue(row: OracleRow, ...candidates: string[]): unknown {
    const entries = Object.entries(row);
    for (const candidate of candidates) {
      const found = entries.find(
        ([key]) => key.toUpperCase() === candidate.toUpperCase(),
      );
      if (found) return found[1];
    }
    return undefined;
  }

  private toText(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text || null;
  }

  private toDateOnly(value: unknown): string | null {
    if (!value) return null;
    if (value instanceof Date) {
      return value.toISOString().slice(0, 10);
    }

    const raw = String(value).trim();
    if (!raw) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed.toISOString().slice(0, 10);
  }

  private inferProgramType(programName?: string | null): string {
    const normalized = String(programName || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    if (normalized.includes('maestr')) return 'Maestria';
    if (normalized.includes('especial')) return 'Especializacion';
    if (normalized.includes('doctor')) return 'Doctorado';
    return 'Pregrado';
  }

  private mapRow(row: OracleRow): OracleGraduateRecord {
    const firstName = this.toText(this.pickValue(row, 'NOMBRES'));
    const lastName = this.toText(this.pickValue(row, 'APELLIDOS'));
    const fullName =
      [firstName, lastName].filter(Boolean).join(' ') ||
      this.toText(this.pickValue(row, 'ESTUDIANTE'));
    const programName = this.toText(this.pickValue(row, 'PROGRAMA'));

    return {
      idNumber: this.toText(this.pickValue(row, 'NUM_IDENTIFICACION')),
      firstName,
      lastName,
      fullName,
      email:
        this.toText(this.pickValue(row, 'DIR_EMAIL')) ||
        this.toText(this.pickValue(row, 'DIR_EMAIL_PER')),
      personalEmail: this.toText(this.pickValue(row, 'DIR_EMAIL_PER')),
      phone: this.toText(this.pickValue(row, 'CELULAR')),
      programCode: this.toText(this.pickValue(row, 'COD_PROGRAMA')),
      programName,
      programType: this.inferProgramType(programName),
      degreeTitle: programName,
      territorial: this.toText(this.pickValue(row, 'TERRITORIAL')),
      campus: this.toText(this.pickValue(row, 'SEDE')),
      numLibro: this.toText(this.pickValue(row, 'NUM_LIBRO')),
      numFolio: this.toText(this.pickValue(row, 'NUM_FOLIO')),
      numRegistro: this.toText(this.pickValue(row, 'NUM_REGISTRO')),
      diplomaNumber: this.toText(this.pickValue(row, 'NUM_DIPLOMA')),
      graduationDate: this.toDateOnly(this.pickValue(row, 'FEC_REGISTRO')),
      numActa: this.toText(this.pickValue(row, 'NUM_ACTA')),
    };
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
        mode: 'disabled',
        schema: config.schema,
        view: config.view,
        qualifiedView: config.qualifiedView,
        message:
          'La integración Oracle SINU está deshabilitada. Defina ORACLE_GRAD_ENABLED=true para probarla.',
      };
    }

    if (missing.length) {
      return {
        ok: false,
        enabled: true,
        driverInstalled: false,
        connected: false,
        mode: 'not-ready',
        schema: config.schema,
        view: config.view,
        qualifiedView: config.qualifiedView,
        missingConfig: missing,
        message: `Faltan variables de entorno para Oracle SINU: ${missing.join(', ')}.`,
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
            message: 'Conexión Oracle SINU exitosa y vista accesible.',
          };
        },
      );
    } catch (error) {
      return {
        ok: false,
        enabled: true,
        driverInstalled,
        connected: false,
        mode: config.clientLibDir ? 'thick' : 'thin',
        clientLibDir: config.clientLibDir || null,
        schema: config.schema,
        view: config.view,
        qualifiedView: config.qualifiedView,
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
            TRIM(TO_CHAR(NUM_IDENTIFICACION)) = :documento
            OR UPPER(REPLACE(REPLACE(REPLACE(TRIM(TO_CHAR(NUM_IDENTIFICACION)), '.', ''), '-', ''), ' ', '')) = :documentoNormalizado
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
        rows: rows.map((row) => ({
          raw: row,
          graduate: this.mapRow(row),
        })),
      };
    });
  }

  async findGraduatesByDocument(
    document: string,
    limit = 100,
  ): Promise<OracleGraduateRecord[]> {
    const result = await this.findByDocument(document, limit);
    return result.rows.map((row) => row.graduate).filter(Boolean);
  }
}
