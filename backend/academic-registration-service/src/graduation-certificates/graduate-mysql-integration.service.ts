import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { OracleGraduateRecord } from './graduate-oracle-integration.service';

export interface MysqlGraduateRecord {
  ID: string | number;
  TIPOIDENTIFICACION: string;
  IDENTIFICACION: string;
  ESTUDIANTE: string;
  TITULO: string;
  REGISTRO: string;
  ACTA: string;
  LIBRO: string;
  DIPLOMA: string;
  FECHAREGISTRO: string;
  AñoGrado: string | number;
}

type MysqlRow = Record<string, unknown>;

type MysqlConnection = {
  execute<T extends MysqlRow[] = MysqlRow[]>(
    sql: string,
    values?: unknown[],
  ): Promise<[T, unknown]>;
  end(): Promise<void>;
};

type MysqlDriver = {
  createConnection(config: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    connectTimeout: number;
    timezone: string;
  }): Promise<MysqlConnection>;
};

type MysqlGraduateConfig = {
  enabled: boolean;
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  view: string;
  qualifiedView: string;
  documentColumn: string;
  escapedDocumentColumn: string;
};

@Injectable()
export class GraduateMysqlIntegrationService {
  private readonly logger = new Logger(GraduateMysqlIntegrationService.name);

  private normalizeBoolean(value: unknown): boolean {
    if (typeof value === 'boolean') return value;
    const normalized = String(value || '')
      .trim()
      .toLowerCase();
    return ['true', '1', 'si', 'yes', 'y'].includes(normalized);
  }

  private normalizeIdentifier(value: string, fieldName: string): string {
    const normalized = String(value || '').trim();

    if (!normalized) {
      throw new ServiceUnavailableException(
        `No se configuro MYSQL_GRAD_${fieldName.toUpperCase()}.`,
      );
    }

    if (!/^[A-Za-z0-9_$]+$/.test(normalized)) {
      throw new ServiceUnavailableException(
        `El valor configurado para MYSQL_GRAD_${fieldName.toUpperCase()} no es valido.`,
      );
    }

    return normalized;
  }

  private normalizePort(value: unknown): number {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 3306;
    return Math.max(1, Math.min(65535, Math.trunc(parsed)));
  }

  private normalizeLimit(limit?: number): number {
    const parsed = Number(limit);
    if (!Number.isFinite(parsed)) return 20;
    return Math.max(1, Math.min(100, Math.trunc(parsed)));
  }

  private escapeIdentifier(value: string): string {
    return `\`${value.replace(/`/g, '``')}\``;
  }

  private getConfig(): MysqlGraduateConfig {
    const rawDatabase = String(
      process.env.MYSQL_GRAD_DATABASE || process.env.MYSQL_GRAD_DB || '',
    ).trim();
    const database = rawDatabase
      ? this.normalizeIdentifier(rawDatabase, 'database')
      : '';
    const view = this.normalizeIdentifier(
      process.env.MYSQL_GRAD_VIEW || 'vw_integracion',
      'view',
    );
    const documentColumn = this.normalizeIdentifier(
      process.env.MYSQL_GRAD_DOCUMENT_COLUMN || 'NUM_IDENTIFICACION',
      'document_column',
    );

    return {
      enabled: this.normalizeBoolean(process.env.MYSQL_GRAD_ENABLED || 'false'),
      host: String(process.env.MYSQL_GRAD_HOST || '').trim(),
      port: this.normalizePort(process.env.MYSQL_GRAD_PORT || '3306'),
      user: String(process.env.MYSQL_GRAD_USER || '').trim(),
      password: String(process.env.MYSQL_GRAD_PASSWORD || ''),
      database,
      view,
      qualifiedView: database
        ? `${this.escapeIdentifier(database)}.${this.escapeIdentifier(view)}`
        : this.escapeIdentifier(view),
      documentColumn,
      escapedDocumentColumn: this.escapeIdentifier(documentColumn),
    };
  }

  private getMissingConfig(config: MysqlGraduateConfig): string[] {
    const missing: string[] = [];

    if (!config.host) missing.push('MYSQL_GRAD_HOST');
    if (!config.user) missing.push('MYSQL_GRAD_USER');
    if (!config.password) missing.push('MYSQL_GRAD_PASSWORD');
    if (!config.database) missing.push('MYSQL_GRAD_DATABASE');

    return missing;
  }

  isEnabled(): boolean {
    return this.getConfig().enabled;
  }

  private ensureReadyConfig(): MysqlGraduateConfig {
    const config = this.getConfig();

    if (!config.enabled) {
      throw new ServiceUnavailableException(
        'La integracion MySQL graduados esta deshabilitada. Activa MYSQL_GRAD_ENABLED=true para usarla.',
      );
    }

    const missing = this.getMissingConfig(config);
    if (missing.length) {
      throw new ServiceUnavailableException(
        `Faltan variables de entorno para MySQL graduados: ${missing.join(', ')}.`,
      );
    }

    return config;
  }

  private loadMysqlDriver(): MysqlDriver {
    try {
      // Carga perezosa para no afectar el arranque cuando MySQL no este habilitado.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('mysql2/promise') as MysqlDriver;
    } catch (error) {
      throw new ServiceUnavailableException(
        `No fue posible cargar el driver MySQL "mysql2" en academic-registration-service. Detalle: ${this.extractErrorMessage(error)}`,
      );
    }
  }

  private async withConnection<T>(
    callback: (
      connection: MysqlConnection,
      config: MysqlGraduateConfig,
    ) => Promise<T>,
  ): Promise<T> {
    const config = this.ensureReadyConfig();
    const driver = this.loadMysqlDriver();
    const connection = await driver.createConnection({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      connectTimeout: 10000,
      timezone: 'Z',
    });

    try {
      return await callback(connection, config);
    } finally {
      try {
        await connection.end();
      } catch (error) {
        this.logger.warn(
          `No se pudo cerrar la conexion MySQL graduados: ${this.extractErrorMessage(error)}`,
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

  private pickValue(row: MysqlRow, ...candidates: string[]): unknown {
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

  private formatDateParts(
    year: number,
    month: number,
    day: number,
  ): string | null {
    const parsed = new Date(year, month - 1, day);
    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    const dmyMatch = raw.match(
      /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s+.*)?$/,
    );
    if (dmyMatch) {
      const [, day, month, year] = dmyMatch;
      return this.formatDateParts(Number(year), Number(month), Number(day));
    }

    const ymdMatch = raw.match(
      /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+.*)?$/,
    );
    if (ymdMatch) {
      const [, year, month, day] = ymdMatch;
      return this.formatDateParts(Number(year), Number(month), Number(day));
    }

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

  private mapRow(row: MysqlRow): MysqlGraduateRecord {
    return {
      ID: this.pickValue(row, 'ID') as any,
      TIPOIDENTIFICACION: this.toText(this.pickValue(row, 'TIPOIDENTIFICACION')) || '',
      IDENTIFICACION: this.toText(this.pickValue(row, 'IDENTIFICACION')) || '',
      ESTUDIANTE: this.toText(this.pickValue(row, 'ESTUDIANTE')) || '',
      TITULO: this.toText(this.pickValue(row, 'TITULO')) || '',
      REGISTRO: this.toText(this.pickValue(row, 'REGISTRO')) || '',
      ACTA: this.toText(this.pickValue(row, 'ACTA')) || '',
      LIBRO: this.toText(this.pickValue(row, 'LIBRO')) || '',
      DIPLOMA: this.toText(this.pickValue(row, 'DIPLOMA')) || '',
      FECHAREGISTRO: this.toDateOnly(this.pickValue(row, 'FECHAREGISTRO')) || '',
      AñoGrado: this.pickValue(row, 'AñoGrado') as any,
    };
  }

  async findGraduatesByDocument(
    document: string,
    limit = 100,
  ): Promise<MysqlGraduateRecord[]> {
    const cleanedDocument = this.sanitizeDocument(document);
    const normalizedDocument = this.normalizeDocument(cleanedDocument);
    const safeLimit = this.normalizeLimit(limit);

    return await this.withConnection(async (connection, config) => {
      const documentColumn = config.escapedDocumentColumn;
      console.log('Buscando graduados por documento', config);
      const [rows] = await connection.execute(
        `SELECT *
           FROM ${config.qualifiedView}
          WHERE (
            TRIM(CAST(${documentColumn} AS CHAR)) = ?
            OR REPLACE(REPLACE(REPLACE(TRIM(CAST(${documentColumn} AS CHAR)), '.', ''), '-', ''), ' ', '') = ?
          )
          LIMIT ?`,
        [cleanedDocument, normalizedDocument, safeLimit],
      );

      return rows.map((row) => this.mapRow(row));
    });
  }
}
