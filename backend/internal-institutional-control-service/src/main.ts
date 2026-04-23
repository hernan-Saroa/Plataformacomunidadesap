import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as bodyParser from 'body-parser';
import { join } from 'path';

async function bootstrap() {
  try {
    console.log('🚀 Iniciando servicio...');
    console.log('� JWT_SECRET:', process.env.JWT_SECRET ? 'CONFIGURED' : 'USING DEFAULT (esap-super-secret-jwt-key-2024)');
    console.log('�📦 Creando aplicación NestJS...');
    
    // Intentar crear la aplicación con manejo de errores de conexión
    let app: NestExpressApplication;
    try {
      app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: ['error', 'warn', 'log'],
      });
      console.log('✅ Aplicación NestJS creada exitosamente');
    } catch (dbError: any) {
      console.error('\n❌ Error al conectar con la base de datos:');
      console.error('   Mensaje:', dbError.message);
      
      // Diagnóstico detallado
      if (dbError.message) {
        if (dbError.message.includes('ECONNREFUSED') || dbError.message.includes('connect')) {
          console.error('\n⚠️  PROBLEMA: No se puede conectar al servidor PostgreSQL');
          console.error('   Soluciones:');
          console.error('   1. Verifica que PostgreSQL esté corriendo:');
          console.error('      - Windows: Servicios > PostgreSQL');
          console.error('      - Linux/Mac: sudo systemctl status postgresql');
          console.error('   2. Verifica el puerto (por defecto 5432):');
          console.error('      netstat -an | findstr 5432  (Windows)');
          console.error('      netstat -an | grep 5432    (Linux/Mac)');
        } else if (dbError.message.includes('password') || dbError.message.includes('authentication')) {
          console.error('\n⚠️  PROBLEMA: Error de autenticación');
          console.error('   Soluciones:');
          console.error('   1. Verifica el usuario y contraseña en las variables de entorno');
          console.error('   2. Crea archivo .env con:');
          console.error('      DB_USER=postgres');
          console.error('      DB_PASS=tu_password');
        } else if (dbError.message.includes('database') && dbError.message.includes('does not exist')) {
          console.error('\n⚠️  PROBLEMA: La base de datos no existe');
          console.error('   Soluciones:');
          console.error('   1. Crea la base de datos:');
          console.error('      psql -U postgres -c "CREATE DATABASE esap_db;"');
          console.error('   2. Crea el schema:');
          console.error('      psql -U postgres -d esap_db -c "CREATE SCHEMA IF NOT EXISTS control_interno;"');
        } else if (dbError.message.includes('timeout')) {
          console.error('\n⚠️  PROBLEMA: Timeout de conexión');
          console.error('   Soluciones:');
          console.error('   1. Verifica que PostgreSQL esté accesible');
          console.error('   2. Verifica el firewall');
          console.error('   3. Verifica que el host y puerto sean correctos');
        }
      }
      
      console.error('\n📋 Configuración actual:');
      console.error(`   DB_HOST: ${process.env.DB_HOST || 'localhost (default)'}`);
      console.error(`   DB_PORT: ${process.env.DB_PORT || '5432 (default)'}`);
      console.error(`   DB_NAME: ${process.env.DB_NAME || 'esap_db (default)'}`);
      console.error(`   DB_USER: ${process.env.DB_USER || 'postgres (default)'}`);
      console.error(`   DB_PASS: ${process.env.DB_PASS ? '***' : 'NO CONFIGURADA'}`);
      console.error(`   DB_SCHEMA: ${process.env.DB_SCHEMA || 'control_interno (default)'}`);
      
      throw dbError;
    }
    
    
    app.enableCors({
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 'Authorization', 'Accept', 'Accept-Charset',
        'x-user-id', 'x-user-username', 'x-user-roles',
        'X-Client-Version', 'X-Client-Platform', 'X-Access-Token',
      'x-client-platform',
      'X-Client-Platform'],
    });

    // Aumentar límite de body-parser para archivos grandes (base64)
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

    // Servir archivos estáticos desde la carpeta uploads
    app.useStaticAssets(join(process.cwd(), 'uploads'), {
      prefix: '/uploads/',
    });

    // Middleware global para establecer charset UTF-8 en todas las respuestas JSON
    app.use((req, res, next) => {
      // Interceptar respuestas JSON para agregar charset UTF-8
      const originalJson = res.json;
      res.json = function (body: any) {
        if (!res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        return originalJson.call(this, body);
      };
      next();
    });

    // Validación global
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    // NOTA: No usar prefijo global aquí.
    // El API Gateway maneja la estructura /{service}/api/v{version}/{path}
    // y reenvía solo el {path} al microservicio.
    // Ejemplo: /control-institucional/api/v1/auditorias -> internal-institutional-control-service:3007/auditorias

    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3007;
    await app.listen(port);
    console.log(`✅ Internal Institutional Control Service running on port ${port}`);
    console.log(`📡 Endpoints disponibles en: http://localhost:${port}`);
    console.log(`📋 Health check: http://localhost:${port}`);
  } catch (error) {
    console.error('❌ Error al iniciar el servicio:');
    console.error('   Tipo:', error.constructor.name);
    console.error('   Mensaje:', error.message);
    console.error('   Stack:', error.stack);
    
    // El manejo de errores de DB ya está arriba
    process.exit(1);
  }
}
bootstrap();
