import { ConfigService } from '@nestjs/config';
import type * as sql from 'mssql';

export interface KlicConfig {
  enabled: boolean;
  poolConfig: sql.config;
}

export function getKlicConfig(configService: ConfigService): KlicConfig {
  const enabled =
    configService.get<string>('KLIC_DB_ENABLED', 'false').toLowerCase() ===
      'true' || configService.get<string>('KLIC_DB_ENABLED') === '1';

  const host =
    configService.get<string>('KLIC_DB_HOST') ||
    configService.get<string>('KLIC_HOST', '172.16.202.145');
  const port = parseInt(
    configService.get<string>('KLIC_DB_PORT') ||
      configService.get<string>('KLIC_PORT', '1433'),
    10,
  );
  const user =
    configService.get<string>('KLIC_DB_USER') ||
    configService.get<string>('KLIC_USER', 'usrIntegracionKlic');
  const password =
    configService.get<string>('KLIC_DB_PASS') ||
    configService.get<string>('KLIC_PASS', '');
  const database =
    configService.get<string>('KLIC_DB_NAME') ||
    configService.get<string>('KLIC_NAME', 'Klic');

  const encrypt =
    configService.get<string>('KLIC_DB_ENCRYPT', 'true').toLowerCase() !==
    'false';
  const trustServerCertificate =
    configService
      .get<string>('KLIC_DB_TRUST_SERVER_CERTIFICATE', 'true')
      .toLowerCase() !== 'false';

  const connectionTimeout = parseInt(
    configService.get<string>('KLIC_DB_CONNECTION_TIMEOUT', '15000'),
    10,
  );
  const requestTimeout = parseInt(
    configService.get<string>('KLIC_DB_REQUEST_TIMEOUT', '30000'),
    10,
  );

  const poolConfig: sql.config = {
    server: host,
    port: isNaN(port) ? 1433 : port,
    user,
    password,
    database,
    options: {
      encrypt,
      trustServerCertificate,
      enableArithAbort: true,
    },
    connectionTimeout: isNaN(connectionTimeout) ? 15000 : connectionTimeout,
    requestTimeout: isNaN(requestTimeout) ? 30000 : requestTimeout,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  return {
    enabled,
    poolConfig,
  };
}
