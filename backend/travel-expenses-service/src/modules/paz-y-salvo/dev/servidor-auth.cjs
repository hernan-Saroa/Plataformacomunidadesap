// SOLO DESARROLLO. Auth real con correo interceptado para el usuario de prueba.
const path = require('path');
const fs = require('fs');
const repo = path.resolve(__dirname, '../../../../../..');
const auth = path.join(repo, 'backend/auth-service');
const travel = path.join(repo, 'backend/travel-expenses-service');
require(path.join(travel, 'node_modules/dotenv')).config({ path: path.join(travel, '.env') });
process.env.DB_SCHEMA = 'auth';
process.env.TYPEORM_SYNC = 'false';
const { NestFactory } = require(path.join(auth, 'node_modules/@nestjs/core'));
const { ValidationPipe } = require(path.join(auth, 'node_modules/@nestjs/common'));
const { DataSource } = require(path.join(auth, 'node_modules/typeorm'));
const { AppModule } = require(path.join(auth, 'dist/app.module'));
const { AuthService } = require(path.join(auth, 'dist/auth/auth.service'));
const { UsersService } = require(path.join(auth, 'dist/users/users.service'));
const { User } = require(path.join(auth, 'dist/users/user.entity'));
const { ResponseInterceptor } = require(path.join(auth, 'dist/common/response.interceptor'));
(async () => {
  const app = await NestFactory.create(AppModule, { logger: ['error'] });
  const db = app.get(DataSource);
  db.setOptions({ logging: false });
  await db.query(`INSERT INTO auth."user" (id_user, public_id, username, password_hash, is_active)
    VALUES ('13110000-0002-4000-8000-000000009001', '13110000-0003-4000-8000-000000009001',
    'efds1311-coordinadora@example.invalid', '!SIN-LOGIN-EFDS1311!', true) ON CONFLICT DO NOTHING`);
  // La base local carece de auth.personas.id_dependencia. No ejecutar migraciones
  // ajenas: el fixture sin persona se carga sin relaciones, solo en este runner.
  app.get(UsersService).findById = async id => {
    if (id !== '13110000-0002-4000-8000-000000009001') throw new Error('Solo usuario del fixture');
    return db.getRepository(User).findOneByOrFail({ id_user: id });
  };
  app.get(AuthService).sendSignatureOtpEmail = async (email, code) => {
    if (email !== 'efds1311-coordinadora@example.invalid') throw new Error('Solo se permiten correos del fixture');
    fs.writeFileSync(path.join(travel, 'otp-browser-1311.log'), code);
  };
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalInterceptors(new ResponseInterceptor());
  await app.listen(3112, '127.0.0.1');
  console.log('Auth de prueba listo en 3112; no envía correos.');
})().catch(error => { console.error(error.message); process.exit(1); });
