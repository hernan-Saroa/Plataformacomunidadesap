import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const appDir = path.resolve(import.meta.dirname, '..');
const servicePath = path.resolve(appDir, 'services/api/disciplinary.service.ts');

const calls = {
  get: [],
  post: [],
  patch: [],
  put: [],
  delete: [],
  upload: [],
};

const apiClient = Object.fromEntries(
  Object.keys(calls).map((method) => [
    method,
    async (...args) => {
      calls[method].push(args);
      return queuedResponses[method].shift();
    },
  ]),
);

const queuedResponses = {
  get: [],
  post: [],
  patch: [],
  put: [],
  delete: [],
  upload: [],
};

function resetMocks() {
  for (const method of Object.keys(calls)) {
    calls[method] = [];
    queuedResponses[method] = [];
  }
}

function loadService() {
  const source = fs.readFileSync(servicePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    fileName: servicePath,
  }).outputText;

  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require: (request) => {
      if (request === './apiClient') return { apiClient };
      if (request === '../../config/environment') {
        return {
          API_MODE: 'gateway',
          MICROSERVICE_URLS: {},
          buildApiUrl: (value) => value,
          getServiceUrl: () => 'http://localhost:3000',
        };
      }
      return require(request);
    },
    console: {
      ...console,
      log: () => undefined,
    },
    FormData,
    File,
    Blob,
    Date,
    window: { location: { origin: 'http://localhost:3111' } },
  };

  vm.runInNewContext(compiled, sandbox, { filename: servicePath });
  return module.exports.disciplinaryService;
}

const createNewsDto = {
  origen: 'QUEJOSO',
  fechaHechos: '2026-05-01',
  territorial: 'Territorial Bogota',
  dependenciaDenunciado: 'Direccion Academica',
  hechos: 'Presunto incumplimiento de funciones reportado por la dependencia.',
  conductas: ['Incumplimiento de deberes'],
  adjuntos: ['acta-inicial.pdf'],
  radicadorId: 'user-radicador-1',
  denunciante: {
    nombre: 'Laura Gomez',
    email: 'laura.gomez@example.com',
    cedula: '1000000001',
  },
  disciplinable: {
    nombre: 'Carlos Perez',
    cargo: 'Profesional Universitario',
    cedula: '1000000002',
    dependencia: 'Direccion Academica',
  },
};

const createdNews = {
  id: 'news-1',
  radicado: 'ND-2026-0001',
  origen: 'QUEJOSO',
  fechaRecepcion: '2026-05-14T09:00:00.000Z',
  fechaHechos: '2026-05-01',
  territorial: createNewsDto.territorial,
  dependenciaDenunciado: createNewsDto.dependenciaDenunciado,
  hechos: createNewsDto.hechos,
  conductas: createNewsDto.conductas,
  adjuntos: createNewsDto.adjuntos,
  denunciante: createNewsDto.denunciante,
  disciplinable: createNewsDto.disciplinable,
  estado: 'RADICADA',
  radicadorId: createNewsDto.radicadorId,
  createdAt: '2026-05-14T09:00:00.000Z',
  updatedAt: '2026-05-14T09:00:00.000Z',
};

const assignProcessDto = {
  newsId: createdNews.id,
  abogadoId: 'prof-1',
  abogadoNombre: 'Diana Ruiz',
  observaciones: 'Asignacion inicial por carga disponible.',
};

const assignedProcess = {
  id: 'process-1',
  radicadoProceso: 'PD-2026-0001',
  etapaActual: 'Valoracion inicial',
  kanbanStage: 'valoracion-inicial',
  estado: 'ACTIVO',
  abogadoAsignadoId: assignProcessDto.abogadoId,
  abogadoAsignadoNombre: assignProcessDto.abogadoNombre,
  fechaPrescripcion: '2029-05-14',
  fechaVencimientoEtapa: '2026-06-14',
  news: { ...createdNews, estado: 'ASIGNADA' },
  createdAt: '2026-05-14T09:10:00.000Z',
  updatedAt: '2026-05-14T09:10:00.000Z',
};

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const service = loadService();

const tests = [
  [
    'crea una noticia disciplinaria con FormData y archivos adjuntos',
    async () => {
      const file = new File(['contenido'], 'soporte.pdf', { type: 'application/pdf' });
      queuedResponses.upload.push(createdNews);

      const result = await service.radicarNoticia(createNewsDto, [file]);
      const [endpoint, formData] = calls.upload[0];

      assert.equal(endpoint, '/control-disciplinario/api/v1/disciplinary-news');
      assert.equal(formData.get('origen'), 'QUEJOSO');
      assert.equal(formData.get('territorial'), createNewsDto.territorial);
      assert.equal(formData.get('dependenciaDenunciado'), createNewsDto.dependenciaDenunciado);
      assert.equal(formData.get('hechos'), createNewsDto.hechos);
      assert.equal(formData.get('fechaHechos'), createNewsDto.fechaHechos);
      assert.equal(formData.get('radicadorId'), createNewsDto.radicadorId);
      assert.deepEqual(JSON.parse(String(formData.get('denunciante'))), createNewsDto.denunciante);
      assert.deepEqual(JSON.parse(String(formData.get('disciplinable'))), createNewsDto.disciplinable);
      assert.deepEqual(JSON.parse(String(formData.get('adjuntos'))), createNewsDto.adjuntos);
      assert.deepEqual(formData.getAll('files'), [file]);
      assert.deepEqual(result, createdNews);
    },
  ],
  [
    'convierte una noticia en proceso asignandola a un profesional',
    async () => {
      queuedResponses.post.push(assignedProcess);

      const result = await service.asignarProceso(assignProcessDto);

      assert.deepEqual(calls.post[0], [
        '/control-disciplinario/api/v1/disciplinary-processes/assign',
        assignProcessDto,
      ]);
      assert.equal(result.news.id, assignProcessDto.newsId);
      assert.equal(result.abogadoAsignadoId, assignProcessDto.abogadoId);
    },
  ],
  [
    'consulta el listado completo de noticias disciplinarias',
    async () => {
      queuedResponses.get.push([createdNews]);

      const result = await service.getAllNoticias();

      assert.deepEqual(calls.get[0], ['/control-disciplinario/api/v1/disciplinary-news']);
      assert.deepEqual(result, [createdNews]);
    },
  ],
  [
    'consulta el listado completo de procesos disciplinarios',
    async () => {
      queuedResponses.get.push([assignedProcess]);

      const result = await service.getAllProcesos();

      assert.deepEqual(calls.get[0], ['/control-disciplinario/api/v1/disciplinary-processes']);
      assert.deepEqual(result, [assignedProcess]);
    },
  ],
  [
    'consulta noticias y procesos filtrados para un profesional',
    async () => {
      queuedResponses.get.push([createdNews], [assignedProcess]);

      const noticias = await service.getMisNoticias(assignProcessDto.abogadoId);
      const procesos = await service.getMisProcesos(assignProcessDto.abogadoId);

      assert.deepEqual(plain(calls.get[0]), [
        '/control-disciplinario/api/v1/disciplinary-news/my-news',
        { profesionalId: assignProcessDto.abogadoId },
      ]);
      assert.deepEqual(plain(calls.get[1]), [
        '/control-disciplinario/api/v1/disciplinary-processes/my-processes',
        { abogadoId: assignProcessDto.abogadoId },
      ]);
      assert.deepEqual(noticias, [createdNews]);
      assert.deepEqual(procesos, [assignedProcess]);
    },
  ],
];

let passed = 0;

for (const [name, test] of tests) {
  resetMocks();
  try {
    await test();
    passed += 1;
    console.log(`OK ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`\n${passed}/${tests.length} pruebas unitarias pasaron.`);
}
