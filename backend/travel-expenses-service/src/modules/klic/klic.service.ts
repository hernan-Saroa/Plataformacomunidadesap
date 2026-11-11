import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type * as sql from 'mssql';
import { getKlicConfig, KlicConfig } from './klic.config';
import {
  KlicContratoDto,
  mapRawRowToKlicContratoDto,
  RawKlicContratoRow,
} from './dto/klic-contrato.dto';
import {
  KlicPaginationQueryDto,
  PaginatedKlicContratosResponseDto,
} from './dto/klic-pagination.dto';

export const KLIC_SQL = Symbol('KLIC_SQL');

@Injectable()
export class KlicService implements OnModuleDestroy {
  private readonly logger = new Logger(KlicService.name);
  private pool: sql.ConnectionPool | null = null;
  private poolPromise: Promise<sql.ConnectionPool> | null = null;
  private readonly klicConfig: KlicConfig;
  private sqlLib: typeof sql | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Optional() @Inject(KLIC_SQL) injectedSql?: typeof sql,
  ) {
    this.klicConfig = getKlicConfig(this.configService);
    if (injectedSql) {
      this.sqlLib = injectedSql;
    }
  }

  private getSql(): typeof sql {
    if (!this.sqlLib) {
      // Lazy require para no cargar tedious/@azure/identity durante inicialización de tests si no se requiere
      this.sqlLib = require('mssql');
    }
    return this.sqlLib!;
  }

  async onModuleDestroy() {
    await this.closePool();
  }

  /**
   * Obtiene o inicializa el ConnectionPool a la base de datos de Klic (SQL Server).
   */
  async getPool(): Promise<sql.ConnectionPool> {
    if (!this.klicConfig.enabled) {
      throw new ServiceUnavailableException(
        'La integración con Klic se encuentra deshabilitada (KLIC_DB_ENABLED=false).',
      );
    }

    if (this.pool && this.pool.connected) {
      return this.pool;
    }

    if (this.poolPromise) {
      return this.poolPromise;
    }

    const sqlDriver = this.getSql();

    this.poolPromise = new Promise(async (resolve, reject) => {
      try {
        this.logger.log(
          `Conectando a base de datos Klic en ${this.klicConfig.poolConfig.server}:${this.klicConfig.poolConfig.port}/${this.klicConfig.poolConfig.database}...`,
        );
        const newPool = new sqlDriver.ConnectionPool(this.klicConfig.poolConfig);
        await newPool.connect();
        this.pool = newPool;
        this.logger.log('Conexión establecida exitosamente con la base de datos Klic.');
        resolve(newPool);
      } catch (error) {
        this.pool = null;
        this.poolPromise = null;
        this.logger.error(
          `Error al conectar a la base de datos Klic (${this.klicConfig.poolConfig.server}): ${error?.message || error}`,
          error?.stack,
        );
        reject(
          new ServiceUnavailableException(
            `No fue posible conectar con la base de datos de Klic: ${error?.message || 'Error de conexión'}`,
          ),
        );
      }
    });

    return this.poolPromise;
  }

  /**
   * Cierra el pool de conexiones de Klic si existe.
   */
  async closePool(): Promise<void> {
    if (this.pool) {
      try {
        await this.pool.close();
        this.logger.log('Pool de conexiones Klic cerrado.');
      } catch (err) {
        this.logger.warn(`Error cerrando pool de Klic: ${err?.message}`);
      } finally {
        this.pool = null;
        this.poolPromise = null;
      }
    }
  }

  /**
   * Verifica la salud y conectividad con la base de datos Klic.
   */
  async checkHealth(): Promise<{
    status: 'connected' | 'disabled' | 'error';
    server?: string;
    database?: string;
    message: string;
    latencyMs?: number;
  }> {
    if (!this.klicConfig.enabled) {
      return {
        status: 'disabled',
        server: this.klicConfig.poolConfig.server,
        database: this.klicConfig.poolConfig.database,
        message: 'La integración con Klic está deshabilitada en la configuración.',
      };
    }

    const start = Date.now();
    try {
      const pool = await this.getPool();
      await pool.request().query('SELECT 1 AS ok');
      const latencyMs = Date.now() - start;
      return {
        status: 'connected',
        server: this.klicConfig.poolConfig.server,
        database: this.klicConfig.poolConfig.database,
        latencyMs,
        message: 'Conexión a Klic operativa.',
      };
    } catch (err) {
      return {
        status: 'error',
        server: this.klicConfig.poolConfig.server,
        database: this.klicConfig.poolConfig.database,
        message: err?.message || 'Fallo de conectividad con Klic.',
      };
    }
  }

  /**
   * Consulta los contratos asociados a un contratista/funcionario por su número de identificación.
   */
  async getContratosByIdentificacion(
    numeroIdentificacion: string,
  ): Promise<KlicContratoDto[]> {
    if (!numeroIdentificacion || !numeroIdentificacion.trim()) {
      return [];
    }

    const cleanId = numeroIdentificacion.trim();
    const sqlDriver = this.getSql();
    const pool = await this.getPool();
    const request = pool.request();
    request.input('numeroIdentificacion', sqlDriver.VarChar(50), cleanId);

    const query = `
      SELECT
          C.NUMERO_CONTRATO        AS [N CONTRATO],
          F.NUMERO_IDENTIFICACION  AS [N IDENTIFICACION],
          STUFF(
              ISNULL(' ' + NULLIF(LTRIM(RTRIM(F.PRIMER_NOMBRE)), ''), '') +
              ISNULL(' ' + NULLIF(LTRIM(RTRIM(F.SEGUNDO_NOMBRE)), ''), '') +
              ISNULL(' ' + NULLIF(LTRIM(RTRIM(F.PRIMER_APELLIDO)), ''), '') +
              ISNULL(' ' + NULLIF(LTRIM(RTRIM(F.SEGUNDO_APELLIDO)), ''), ''),
              1, 1, ''
          )                        AS [NOMBRE],
          C.FECHA_INICIO           AS [FECHA INICIAL],
          C.FECHA_FINAL            AS [FECHA FINAL],
          C.NUMERO_CDP             AS [CDP],
          C.NUMERO_RP              AS [RP],
          C.VALOR_TOTAL            AS [VALOR CONTRATO],
          C.ID_AREA                AS [ID AREA],
          A.DESCRIPCION            AS [AREA],
          T.DES_TIPO_AFECTACION    AS [AFECTACION],
          C.NUMERO_CUENTA          AS [CUENTA BANCARIA]
      FROM CONTRATO C
          INNER JOIN FUNCIONARIO F
              ON F.ID_FUNCIONARIO = C.ID_FUNCIONARIO
          LEFT JOIN AREAS A
              ON A.ID_AREA = C.ID_AREA
          LEFT JOIN TIPO_AFECTACION_RECURSOS T
              ON T.ID_TIPO_AFECTACION = C.ID_AFECTACION_RECURSO
      WHERE F.NUMERO_IDENTIFICACION = @numeroIdentificacion
      ORDER BY C.FECHA_FINAL, C.NUMERO_CONTRATO;
    `;

    const result = await request.query<RawKlicContratoRow>(query);
    return (result.recordset || []).map(mapRawRowToKlicContratoDto);
  }

  /**
   * Consulta paginada de contratos con soporte de búsqueda y filtros.
   */
  async getContratosPaginados(
    params: KlicPaginationQueryDto,
  ): Promise<PaginatedKlicContratosResponseDto> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 10));
    const offset = (page - 1) * limit;

    const sqlDriver = this.getSql();
    const pool = await this.getPool();
    const request = pool.request();
    request.input('offset', sqlDriver.Int, offset);
    request.input('limit', sqlDriver.Int, limit);

    const conditions: string[] = [];

    if (params.numeroIdentificacion && params.numeroIdentificacion.trim()) {
      request.input(
        'identificacionFilter',
        sqlDriver.VarChar(50),
        params.numeroIdentificacion.trim(),
      );
      conditions.push('F.NUMERO_IDENTIFICACION = @identificacionFilter');
    }

    if (params.search && params.search.trim()) {
      request.input('searchPattern', sqlDriver.VarChar(100), `%${params.search.trim()}%`);
      conditions.push(
        `(
          F.NUMERO_IDENTIFICACION LIKE @searchPattern
          OR C.NUMERO_CONTRATO LIKE @searchPattern
          OR F.PRIMER_NOMBRE LIKE @searchPattern
          OR F.PRIMER_APELLIDO LIKE @searchPattern
          OR A.DESCRIPCION LIKE @searchPattern
        )`,
      );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT
          C.NUMERO_CONTRATO        AS [N CONTRATO],
          F.NUMERO_IDENTIFICACION  AS [N IDENTIFICACION],
          STUFF(
              ISNULL(' ' + NULLIF(LTRIM(RTRIM(F.PRIMER_NOMBRE)), ''), '') +
              ISNULL(' ' + NULLIF(LTRIM(RTRIM(F.SEGUNDO_NOMBRE)), ''), '') +
              ISNULL(' ' + NULLIF(LTRIM(RTRIM(F.PRIMER_APELLIDO)), ''), '') +
              ISNULL(' ' + NULLIF(LTRIM(RTRIM(F.SEGUNDO_APELLIDO)), ''), ''),
              1, 1, ''
          )                        AS [NOMBRE],
          C.FECHA_INICIO           AS [FECHA INICIAL],
          C.FECHA_FINAL            AS [FECHA FINAL],
          C.NUMERO_CDP             AS [CDP],
          C.NUMERO_RP              AS [RP],
          C.VALOR_TOTAL            AS [VALOR CONTRATO],
          C.ID_AREA                AS [ID AREA],
          A.DESCRIPCION            AS [AREA],
          T.DES_TIPO_AFECTACION    AS [AFECTACION],
          C.NUMERO_CUENTA          AS [CUENTA BANCARIA],
          COUNT(1) OVER()          AS TotalCount
      FROM CONTRATO C
          INNER JOIN FUNCIONARIO F
              ON F.ID_FUNCIONARIO = C.ID_FUNCIONARIO
          LEFT JOIN AREAS A
              ON A.ID_AREA = C.ID_AREA
          LEFT JOIN TIPO_AFECTACION_RECURSOS T
              ON T.ID_TIPO_AFECTACION = C.ID_AFECTACION_RECURSO
      ${whereClause}
      ORDER BY C.FECHA_FINAL DESC, C.NUMERO_CONTRATO
      OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;
    `;

    const result = await request.query<RawKlicContratoRow>(query);
    const records = result.recordset || [];

    const total = records.length > 0 && records[0].TotalCount != null ? Number(records[0].TotalCount) : 0;
    const data = records.map(mapRawRowToKlicContratoDto);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }
}
