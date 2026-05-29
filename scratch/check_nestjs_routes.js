const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function run() {
  console.log('Bootstrapping AppModule in dry-run/inspect mode...');
  // Set mock/empty env vars if needed so it doesn't fail on DB connection or other external services
  process.env.PORT = '9999';
  process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/esap_db';
  
  // We can just create the Nest application but not listen
  const app = await NestFactory.create(AppModule, { logger: false });
  
  const server = app.getHttpServer();
  const router = server._events.request._router;

  console.log('--- REGISTERED ROUTES ---');
  const routes = [];
  
  router.stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly on the app
      const path = middleware.route.path;
      const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
      routes.push({ path, methods });
    } else if (middleware.name === 'router') {
      // Routes registered via routers/controllers
      middleware.handle.stack.forEach((handler) => {
        if (handler.route) {
          const path = handler.route.path;
          const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
          routes.push({ path, methods });
        }
      });
    }
  });

  console.table(routes.sort((a, b) => a.path.localeCompare(b.path)));
  await app.close();
}

run().catch(console.error);
