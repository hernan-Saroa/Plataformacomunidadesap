// Ejecutar explícitamente con el runner instalado de RUND. No altera el config de auth.
// Este checkout tiene ts-jest disponible en rund-service y su Jest resuelve el transformador.
const path = require('node:path');
const { createRequire } = require('node:module');
const authRoot = path.resolve(__dirname, '../backend/auth-service');
const rundRequire = createRequire(path.resolve(__dirname, '../backend/rund-service/package.json'));
const base = require(path.join(authRoot, 'package.json')).jest;
module.exports = { ...base, rootDir: path.join(authRoot, 'src'),
  transform: { '^.+\\.(t|j)s$': [rundRequire.resolve('ts-jest'), { tsconfig: path.join(authRoot, 'tsconfig.json') }] } };
