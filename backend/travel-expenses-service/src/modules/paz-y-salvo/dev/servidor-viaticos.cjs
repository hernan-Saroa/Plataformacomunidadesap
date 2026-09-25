// SOLO DESARROLLO. Sin cron ni módulos que procesen comisiones de otros agentes.
const path = require('path');
const service = path.resolve(__dirname, '../../../..');
require(path.join(service, 'node_modules/dotenv')).config({ path: path.join(service, '.env') });
process.env.AUTH_SERVICE_URL = 'http://127.0.0.1:3112';
process.env.TRAVEL_EXPENSES_STORAGE_PATH = path.join(service, '.cache/efds1311/uploads');
const { Module, ValidationPipe } = require(path.join(service, 'node_modules/@nestjs/common'));
const { NestFactory } = require(path.join(service, 'node_modules/@nestjs/core'));
const { TypeOrmModule } = require(path.join(service, 'node_modules/@nestjs/typeorm'));
const { AuthModule } = require(path.join(service, 'dist/auth/auth.module'));
const { PazYSalvoModule } = require(path.join(service, 'dist/modules/paz-y-salvo/paz-y-salvo.module'));
class PruebaModule {}
Module({ imports: [TypeOrmModule.forRoot({ type: 'postgres', host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT), username: process.env.DB_USER, password: process.env.DB_PASS,
  database: process.env.DB_NAME, synchronize: false }), AuthModule, PazYSalvoModule] })(PruebaModule);
(async () => {
  const app = await NestFactory.create(PruebaModule, { logger: ['error'] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(3111, '127.0.0.1');
  console.log('Paz y salvo aislado en 3111');
})().catch(error => { console.error(error.message); process.exit(1); });
