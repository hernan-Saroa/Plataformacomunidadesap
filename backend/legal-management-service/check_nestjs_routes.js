const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');

async function run() {
  console.log('Bootstrapping AppModule in dry-run/inspect mode...');
  process.env.PORT = '9999';
  process.env.DATABASE_URL = 'postgres://postgres:postgres@localhost:5432/esap_db';
  
  const app = await NestFactory.create(AppModule, { logger: false });
  await app.init();
  
  const expressInstance = app.getHttpAdapter().getInstance();
  const router = expressInstance._router || expressInstance.router;

  if (!router) {
    console.error('Express router not found in adapter instance.');
    await app.close();
    return;
  }

  console.log('--- REGISTERED ACTUACIONES ROUTES ---');
  const routes = [];
  
  const processStack = (stack) => {
    if (!stack) return;
    stack.forEach((middleware) => {
      if (middleware.route) {
        const path = middleware.route.path;
        if (path.includes('actuaciones')) {
          const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
          routes.push({ path, methods });
        }
      } else if (middleware.name === 'router' && middleware.handle && middleware.handle.stack) {
        processStack(middleware.handle.stack);
      }
    });
  };

  processStack(router.stack);

  console.table(routes.sort((a, b) => a.path.localeCompare(b.path)));
  await app.close();
}

run().catch(console.error);
