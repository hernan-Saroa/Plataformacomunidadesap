import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

/** Ejecuta el parser y las reglas reales del importador; no carga Nest ni conecta a la base. */
export async function validarCatalogo(archivo) {
  const raiz = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
  const resultado = await build({
    stdin: { contents: `export { ExcelParserService } from './backend/academic-work-plan-service/src/pta/asignaturas-import/parsers/excel-parser.service'; export { ImportValidator } from './backend/academic-work-plan-service/src/pta/asignaturas-import/validators/import.validator';`, resolveDir: raiz, loader: 'ts' },
    bundle: true, platform: 'node', format: 'cjs', write: false, packages: 'external',
    plugins: [{ name: 'decoradores-sin-servidor', setup(b) {
      b.onResolve({ filter: /^@nestjs\/common$/ }, () => ({ path: 'nest-sin-servidor', namespace: 'verificacion' }));
      b.onLoad({ filter: /.*/, namespace: 'verificacion' }, () => ({ contents: `export const Injectable = () => () => {}; export class BadRequestException extends Error { constructor(value) { super(typeof value === 'string' ? value : JSON.stringify(value)); } }`, loader: 'js' }));
    } }],
  });
  // Solo se sustituyen el decorador de inyección y la clase de error de Nest.
  // El parseo de celdas, la matriz y las reglas R1-R6 proceden del código publicado.
  const modulo = { exports: {} };
  const require = createRequire(import.meta.url);
  new Function('require', 'module', 'exports', resultado.outputFiles[0].text)(require, modulo, modulo.exports);
  const { ExcelParserService, ImportValidator } = modulo.exports;
  const parsed = new ExcelParserService().parseExcel(fs.readFileSync(archivo));
  return { ...ImportValidator.validarPreInsert(parsed.asignaturas, parsed.programas, parsed.matrizProgramCodes), asignaturas: parsed.asignaturas.length, programas: parsed.programas.length, ofertas: parsed.matrizOferta.reduce((n, fila) => n + fila.programas_ofertados.length, 0) };
}
