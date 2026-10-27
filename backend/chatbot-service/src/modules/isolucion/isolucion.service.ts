import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type * as Sql from 'mssql';
import { identifier, isolucionConfig, IsolucionConfig, IsolucionError } from './isolucion.config';

export const ISOLUCION_SQL = Symbol('ISOLUCION_SQL');
// mssql 12.7 admite timeout por petición; @types/mssql aún declara un solo argumento.
type TimedRequestConstructor = new (pool: Sql.ConnectionPool, overrides: { requestTimeout: number }) => Sql.Request;
export interface DocumentSource {
  id: string; titulo: string; extracto: string; version?: string; url?: string;
}

const STOP_WORDS = new Set('para como donde cual cuales sobre quiero necesito puedes favor documento documentos informacion consultar buscar saber esta este esto una unos unas los las del que por con sin desde hasta tiene son uso usar ayuda hola gracias'.split(' '));

export function searchTerms(question: string): string[] {
  return [...new Set(question.toLowerCase().match(/[\p{L}\p{N}]{3,40}/gu) || [])]
    .filter((word) => !STOP_WORDS.has(word.normalize('NFD').replace(/[\u0300-\u036f]/g, ''))).slice(0, 4);
}

export function safeDocumentUrl(value: unknown): string | undefined {
  try {
    const url = new URL(String(value || ''));
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return undefined;
    return url.href;
  } catch { return undefined; }
}

@Injectable()
export class IsolucionService implements OnModuleDestroy {
  private pool?: Sql.ConnectionPool;
  private connecting?: Promise<Sql.ConnectionPool>;
  private retryAfter = 0;

  constructor(private readonly config: ConfigService, @Inject(ISOLUCION_SQL) private readonly sql: typeof Sql) {}

  isSearchEnabled(): boolean {
    // La integración desactivada no debe afectar el chat por configuración incompleta.
    return this.config.get('CHATBOT_ISOLUCION_ENABLED') === 'true'
      && this.config.get('CHATBOT_ISOLUCION_SEARCH_ENABLED') === 'true';
  }

  private getReadyConfig(): IsolucionConfig {
    const config = isolucionConfig(this.config);
    if (!config.enabled) throw new IsolucionError('DISABLED');
    if (!config.server || !config.database || !config.user || !config.password) throw new IsolucionError('MISSING_CONFIG');
    return config;
  }

  private async getPool(config: IsolucionConfig): Promise<Sql.ConnectionPool> {
    if (this.pool?.connected) return this.pool;
    if (this.connecting) return this.connecting;
    if (Date.now() < this.retryAfter) throw new IsolucionError('CONNECTION_UNAVAILABLE');
    const pool = new this.sql.ConnectionPool({
      server: config.server, port: config.port, database: config.database,
      user: config.user, password: config.password,
      connectionTimeout: 5000, requestTimeout: 2500,
      pool: { min: 0, max: 2, idleTimeoutMillis: 30000, acquireTimeoutMillis: 5000 },
      options: {
        encrypt: config.encrypt, trustServerCertificate: config.trustServerCertificate,
        readOnlyIntent: true, appName: 'ESAP-chatbot-Isolucion',
      },
    });
    // El driver emite eventos además de rechazar las promesas; no divulgar mensajes SQL.
    pool.on('error', () => { this.retryAfter = Date.now() + 30000; });
    this.connecting = (async () => {
      try { this.pool = await pool.connect(); return this.pool; }
      catch (error) {
        this.retryAfter = Date.now() + 30000;
        await pool.close().catch(() => undefined);
        throw this.safeError(error);
      } finally { this.connecting = undefined; }
    })();
    return this.connecting;
  }

  private safeError(error: unknown): IsolucionError {
    if (error instanceof IsolucionError) return error;
    const code = (error as { code?: string })?.code;
    if (code === 'ELOGIN') return new IsolucionError('AUTHENTICATION_FAILED');
    if (code === 'ETIMEOUT') return new IsolucionError('TIMEOUT');
    if (code === 'ESOCKET' || code === 'ECONNCLOSED') return new IsolucionError('CONNECTION_UNAVAILABLE');
    return new IsolucionError('QUERY_FAILED');
  }

  private request(pool: Sql.ConnectionPool, deadline: number): Sql.Request {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw new IsolucionError('TIMEOUT');
    const Request = this.sql.Request as unknown as TimedRequestConstructor;
    return new Request(pool, { requestTimeout: Math.min(2500, remaining) });
  }

  private async inspect(pool: Sql.ConnectionPool, config: IsolucionConfig, deadline: number) {
    const views = await this.request(pool, deadline)
      .input('view', this.sql.NVarChar(128), config.view)
      .input('schema', this.sql.NVarChar(128), config.schema || null)
      .query(`SELECT SCHEMA_NAME(v.schema_id) AS esquema, v.name AS vista,
        HAS_PERMS_BY_NAME(QUOTENAME(SCHEMA_NAME(v.schema_id)) + N'.' + QUOTENAME(v.name), N'OBJECT', N'SELECT') AS puede_consultar
        FROM sys.views v WHERE v.name = @view AND (@schema IS NULL OR SCHEMA_NAME(v.schema_id) = @schema)`);
    if (!views.recordset.length) throw new IsolucionError('VIEW_NOT_VISIBLE');
    if (views.recordset.length !== 1) throw new IsolucionError('AMBIGUOUS_SCHEMA');
    const view = views.recordset[0];
    if (Number(view.puede_consultar) !== 1) throw new IsolucionError('SELECT_NOT_ALLOWED');
    const qualifiedView = `${identifier(view.esquema)}.${identifier(view.vista)}`;
    const columns = await this.request(pool, deadline)
      .input('view', this.sql.NVarChar(128), view.vista)
      .input('schema', this.sql.NVarChar(128), view.esquema)
      .query(`SELECT c.name AS columna, t.name AS tipo, c.is_nullable AS admite_nulos
        FROM sys.views v JOIN sys.columns c ON c.object_id = v.object_id
        JOIN sys.types t ON t.user_type_id = c.user_type_id
        WHERE v.name = @view AND SCHEMA_NAME(v.schema_id) = @schema ORDER BY c.column_id`);
    // Verifica acceso real sin leer filas documentales ni asumir un esquema dbo.
    await this.request(pool, deadline).query(`SELECT TOP (0) * FROM ${qualifiedView}`);
    return { esquema: view.esquema as string, vista: view.vista as string, qualifiedView, columnas: columns.recordset };
  }

  private validateMapping(config: IsolucionConfig, columns: { columna: string }[]): void {
    if (!config.columns.id || !config.columns.title || !config.columns.text
      || !config.columns.allowed || !config.allowedValue) throw new IsolucionError('MAPPING_REQUIRED');
    if (config.allowedValue.length > 512) throw new IsolucionError('INVALID_MAPPING');
    const names = new Set(columns.map((column) => column.columna));
    for (const column of Object.values(config.columns).filter(Boolean)) {
      identifier(column);
      if (!names.has(column)) throw new IsolucionError('INVALID_MAPPING');
    }
  }

  async diagnostic() {
    try {
      const config = this.getReadyConfig();
      const deadline = Date.now() + 14000;
      const pool = await this.getPool(config);
      const metadata = await this.inspect(pool, config, deadline);
      let mappingStatus = 'ready';
      try { this.validateMapping(config, metadata.columnas); }
      catch (error) { mappingStatus = this.safeError(error).code; }
      return { connected: true, ...metadata, searchEnabled: config.searchEnabled, mappingStatus };
    } catch (error) {
      return { connected: false, code: this.safeError(error).code };
    }
  }

  async search(question: string): Promise<DocumentSource[]> {
    if (!this.isSearchEnabled()) return [];
    const terms = searchTerms(question);
    if (!terms.length) return [];
    try {
      const config = this.getReadyConfig();
      // No consultar registros con un mapeo incompleto, incluso antes de conectar.
      this.validateMapping(config, Object.values(config.columns).filter(Boolean).map((columna) => ({ columna })));
      const deadline = Date.now() + 14000;
      const pool = await this.getPool(config);
      const metadata = await this.inspect(pool, config, deadline);
      this.validateMapping(config, metadata.columnas);
      const c = config.columns;
      const asText = (column: string, length: number | 'max') => `CONVERT(nvarchar(${length}), ${identifier(column)})`;
      const request = this.request(pool, deadline)
        .input('allowed', this.sql.NVarChar(512), config.allowedValue);
      const conditions = terms.map((term, index) => {
        request.input(`term${index}`, this.sql.NVarChar(100), `%${term}%`);
        return `(${asText(c.title, 2000)} LIKE @term${index} OR ${asText(c.text, 'max')} LIKE @term${index})`;
      });
      const result = await request.query(`SELECT TOP (3)
        ${asText(c.id, 200)} AS id, ${asText(c.title, 500)} AS titulo,
        ${asText(c.text, 2000)} AS extracto,
        ${c.url ? asText(c.url, 2000) : 'NULL'} AS url,
        ${c.version ? asText(c.version, 100) : 'NULL'} AS version
        FROM ${metadata.qualifiedView}
        WHERE ${asText(c.allowed, 'max')} = @allowed AND ${conditions.join(' AND ')}
        ORDER BY ${asText(c.title, 500)}, ${asText(c.id, 200)}`);
      return result.recordset.map((row) => ({
        id: String(row.id ?? '').slice(0, 200), titulo: String(row.titulo ?? '').slice(0, 500),
        extracto: String(row.extracto ?? '').slice(0, 2000),
        ...(row.version ? { version: String(row.version).slice(0, 100) } : {}),
        ...(safeDocumentUrl(row.url) ? { url: safeDocumentUrl(row.url) } : {}),
      })).filter((row) => row.id && row.titulo && row.extracto);
    } catch (error) { throw this.safeError(error); }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.connecting) await this.connecting.catch(() => undefined);
    await this.pool?.close().catch(() => undefined);
    this.pool = undefined;
  }
}
