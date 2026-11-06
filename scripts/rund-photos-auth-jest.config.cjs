// Use the installed RUND Jest toolchain to verify the legacy auth adapter.
// Does not change auth-service's default Jest configuration or dependencies.
const path=require('node:path');
const service=path.resolve(__dirname,'../backend/auth-service');
module.exports={
  rootDir:path.join(service,'src'),
  testMatch:['**/portal-photo.spec.ts'],
  transform:{'^.+\\.(t|j)s$':[require.resolve('../backend/academic-work-plan-service/node_modules/ts-jest'),{tsconfig:path.join(service,'tsconfig.json')}]},
  testEnvironment:'node',
};
