import * as fs from 'fs';
import { localRundUploadPath } from './rund-upload-paths';
import { join, resolve, sep } from 'path';
import { BancoDocentesService } from './banco-docentes.service';
import { BancoDocentesController } from './banco-docentes.controller';
import { RundDocumentStorageService } from './rund-document-storage.service';
import { ServiceUnavailableException } from '@nestjs/common';

describe('Soportes históricos: diagnóstico y reparación sin duplicar rutas', () => {
  let temp: string;
  let cwd: jest.SpyInstance;
  let service: BancoDocentesService;
  let query: jest.Mock;
  let supports: any[];
  let folder: string;
  let nombres: jest.Mock;
  let nombreHistorico: jest.Mock;
  const docente = { id: 'docente-textual', personaId: 'persona-ficticia' };
  const tempParent = resolve(process.cwd(), '../../tmp');

  beforeEach(() => {
    fs.mkdirSync(tempParent, { recursive: true });
    temp = fs.mkdtempSync(join(tempParent, 'rund-soportes-test-'));
    cwd = jest.spyOn(process, 'cwd').mockReturnValue(temp);
    folder = join(temp, 'uploads', 'carpeta-digital', 'DOCENTE PRUEBA', 'RUND');
    fs.mkdirSync(folder, { recursive: true });
    supports = [];
    query = jest.fn(async (sql: string, params: any[]) => {
      if (sql.includes('SELECT nom_largo')) return [{ nom_largo: 'DOCENTE PRUEBA' }];
      if (sql.includes('FROM rund."RundSoporteCampo" s')) return supports;
      if (sql.includes('UPDATE rund."RundSoporteCampo"')) {
        Object.assign(supports.find(s => s.id === params[2]), { documento_carpeta_id: params[0] });
      }
      if (sql.includes('INSERT INTO rund."RundSoporteCampo"')) supports.push({ id: params[0], documento_carpeta_id: params[4] });
      return [];
    });
    const repo = { find: jest.fn().mockResolvedValue([docente]), findOne: jest.fn().mockResolvedValue(docente) };
    const personas = { findOne: jest.fn().mockResolvedValue({ primer_nombre: 'DOCENTE', primer_apellido: 'PRUEBA' }) };
    nombres = jest.fn().mockResolvedValue(new Map([[docente.personaId, 'DOCENTE PRUEBA']]));
    nombreHistorico = jest.fn().mockResolvedValue({ primer_nombre: 'DOCENTE', primer_apellido: 'PRUEBA' });
    service = new BancoDocentesService(repo as any, personas as any, {} as any, {} as any, {} as any, { query } as any,
      { territorialesBanco: jest.fn().mockResolvedValue([]), nombreHistorico } as any, {} as any,
      { nombresPorPersonas: nombres, fichaPorPersona: jest.fn().mockResolvedValue(null), personasPorAlias: jest.fn().mockResolvedValue([]) } as any);
    jest.spyOn(service as any, 'resolveDocenteId').mockResolvedValue(docente.id);
  });
  afterEach(() => {
    cwd.mockRestore();
    const target = resolve(temp);
    if (!target.startsWith(tempParent + sep + 'rund-soportes-test-')) throw new Error('Limpieza fuera del directorio temporal');
    fs.rmSync(target, { recursive: true, force: true });
  });

  it('diagnostica URLs PTA/RUND y documentos versionados sin modificar referencias', async () => {
    fs.writeFileSync(join(folder, 'original.pdf'), 'original');
    const version = join(temp, 'uploads', 'rund-documentos', 'perfil', 'v2.pdf');
    fs.mkdirSync(join(version, '..'), { recursive: true });
    fs.writeFileSync(version, 'version-dos');
    supports = [
      { id: 'antiguo', documento_carpeta_id: '/pta/api/v1/uploads/carpeta-digital/DOCENTE PRUEBA/RUND/original.pdf' },
      { id: 'nuevo', documento_carpeta_id: '/rund/api/v1/uploads/carpeta-digital/DOCENTE%20PRUEBA/RUND/original.pdf' },
      { id: 'version', documento_perfil_id: 'version-2', proveedor_almacenamiento: 'LOCAL', almacenamiento_ruta: 'rund-documentos/perfil/v2.pdf' },
      { id: 'externo', documento_carpeta_id: '/auth/api/v1/uploads/archivo.pdf' },
      { id: 'inseguro', documento_carpeta_id: '/pta/api/v1/uploads/../../fuera.pdf' },
    ];
    const previous = JSON.stringify(supports);
    const result = await service.syncCheckDocente(docente.id);
    expect(result.details.map(item => item.existsOnDisk)).toEqual([true, true, true, false, false]);
    expect(JSON.stringify(supports)).toBe(previous);
    expect(query.mock.calls.every(([sql]) => sql.startsWith('SELECT'))).toBe(true);
  });

  it('considera equivalentes referencias anteriores y nuevas sin crear soportes duplicados', async () => {
    fs.writeFileSync(join(folder, 'anterior.pdf'), 'anterior');
    fs.writeFileSync(join(folder, 'nuevo.pdf'), 'nuevo');
    supports = [
      { id: 'antiguo', documento_carpeta_id: '/pta/api/v1/uploads/carpeta-digital/DOCENTE PRUEBA/RUND/anterior.pdf', estado: 'Aprobado' },
      { id: 'nuevo', documento_carpeta_id: '/services/rund/api/v1/uploads/carpeta-digital/DOCENTE%20PRUEBA/RUND/nuevo.pdf', revisiones_campos: { campo: 'vigente' } },
    ];
    const previous = JSON.stringify(supports);
    expect(await service.repararSoportesMasivo()).toMatchObject({ totalRegistrosEnlazados: 0, totalRegistrosCreados: 0 });
    expect(JSON.stringify(supports)).toBe(previous);
  });

  it('diagnóstico conserva segundo nombre, espacios, acentos y regla histórica de PTA', async () => {
    nombreHistorico.mockResolvedValue({ primer_nombre: ' José ', segundo_nombre: ' Luis', primer_apellido: 'Muñoz', segundo_apellido: ' PÉREZ' });
    const result = await service.syncCheckDocente(docente.id);
    expect(result.docenteNombre).toBe('JOS   LUIS MUOZ  PREZ');
    expect(nombres).not.toHaveBeenCalled();
    expect(nombreHistorico).toHaveBeenCalledWith(docente.personaId);
  });

  it('ausencia confirmada en PTA conserva nombre de carpeta con ID nativo', async () => {
    nombreHistorico.mockResolvedValue(null);
    expect((await service.syncCheckDocente(docente.id)).docenteNombre).toBe(docente.id);
  });

  it('PTA caído detiene diagnóstico sin inventar carpeta ni consultar Persona local', async () => {
    nombreHistorico.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.syncCheckDocente(docente.id)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(query).not.toHaveBeenCalled();
    expect((service as any).personaRepo.findOne).not.toHaveBeenCalled();
  });

  it('reparación confirma todas las identidades antes del primer enlace y conserva archivos si Auth falla', async () => {
    fs.writeFileSync(join(folder, 'nuevo.pdf'), 'contenido original');
    supports = [{ id: 'sin-url', documento_carpeta_id: null }];
    nombres.mockRejectedValue(new ServiceUnavailableException());
    await expect(service.repararSoportesMasivo()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(query).not.toHaveBeenCalled();
    expect(supports).toEqual([{ id: 'sin-url', documento_carpeta_id: null }]);
    expect(fs.readFileSync(join(folder, 'nuevo.pdf'), 'utf8')).toBe('contenido original');
  });

  it.each([new Map(), new Map([[docente.personaId, null]]), new Map([[docente.personaId, '']])])(
    'reparación conserva carpeta por ID para persona ausente o nombre vacío confirmado %s', async snapshot => {
      nombres.mockResolvedValue(snapshot);
      const nativeFolder = join(temp, 'uploads', 'carpeta-digital', docente.id, 'RUND');
      fs.mkdirSync(nativeFolder, { recursive: true }); fs.writeFileSync(join(nativeFolder, 'nuevo.pdf'), 'original');
      expect(await service.repararSoportesMasivo()).toMatchObject({ totalRegistrosCreados: 1 });
      expect(supports[0].documento_carpeta_id).toContain('/' + docente.id + '/RUND/');
    });

  it('enlaza referencias ausentes y crea solo los archivos sin registro con URLs de RUND', async () => {
    fs.writeFileSync(join(folder, 'uno.pdf'), 'uno');
    fs.writeFileSync(join(folder, 'dos.pdf'), 'dos');
    supports = [{ id: 'sin-url', documento_carpeta_id: null }];
    expect(await service.repararSoportesMasivo()).toMatchObject({ totalRegistrosEnlazados: 1, totalRegistrosCreados: 1 });
    expect(supports.every(s => s.documento_carpeta_id.startsWith('/rund/api/v1/uploads/'))).toBe(true);
    // La tabla real no tiene updatedAt: el enlace solo modifica estas dos columnas.
    const update = query.mock.calls.find(([sql]) => sql.includes('UPDATE rund."RundSoporteCampo"'));
    expect(update?.[0]).not.toContain('updatedAt');
    expect(await service.repararSoportesMasivo()).toMatchObject({ totalRegistrosEnlazados: 0, totalRegistrosCreados: 0 });
    expect(supports).toHaveLength(2);
  });

  it('respeta una versión LEGACY_LOCAL aunque el enlace público sea de contenido', async () => {
    fs.writeFileSync(join(folder, 'version.pdf'), 'version');
    supports = [{ id: 'version', documento_perfil_id: 'perfil-1', documento_carpeta_id: '/rund/api/v1/pta/banco-docentes/id/documentos/doc/contenido',
      proveedor_almacenamiento: 'LEGACY_LOCAL', almacenamiento_ruta: '/uploads/carpeta-digital/DOCENTE PRUEBA/RUND/version.pdf' }];
    expect(await service.repararSoportesMasivo()).toMatchObject({ totalRegistrosEnlazados: 0, totalRegistrosCreados: 0 });
  });

  it('un documento versionado sin URL no se reasigna arbitrariamente al archivo encontrado', async () => {
    fs.writeFileSync(join(folder, 'sin-registro.pdf'), 'archivo');
    supports = [{ id: 'version', documento_perfil_id: 'perfil-1', documento_carpeta_id: null, proveedor_almacenamiento: 'OPENKM', almacenamiento_ruta: '/okm:root/RUND/archivo' }];
    expect(await service.repararSoportesMasivo()).toMatchObject({ totalRegistrosEnlazados: 0, totalRegistrosCreados: 1 });
    expect(supports[0].documento_carpeta_id).toBeNull();
  });

  it('el soporte técnico se guarda en memoria con el nombre recibido y su URL apunta al archivo real', async () => {
    const vincular = jest.fn(async (_id, _bloque, body) => ({ ...body }));
    const controller = new BancoDocentesController({ vincularSoporte: vincular } as any,
      { validate: jest.fn().mockResolvedValue({ validated: false }) } as any);
    const otraCarpeta = join(process.cwd(), 'uploads', 'carpeta-digital', 'OTRO NOMBRE');
    try {
      const result = await controller.vincularSoporte(docente.id, 'TRANSVERSAL', { tipoSoporte: 'soporte_edicion_perfil', docenteNombre: 'OTRO NOMBRE' },
        { user: { userId: 'operador', roles: ['SUPER_ADMIN'] } },
        { buffer: Buffer.from('soporte'), originalname: 'original.pdf', mimetype: 'application/pdf', size: 7 } as any);
      const url = (result.data as any).documentoCarpetaId as string;
      expect(url).toMatch(new RegExp('^/rund/api/v1/uploads/carpeta-digital/OTRO%20NOMBRE/RUND/[0-9a-f-]{36}\\.pdf$'));
      // Con multer en memoria el cuerpo ya está completo: el nombre llega antes de escribir y el archivo existe donde apunta la URL.
      const local = localRundUploadPath(url)!;
      expect(fs.readFileSync(local, 'utf8')).toBe('soporte');
    } finally {
      fs.rmSync(otraCarpeta, { recursive: true, force: true });
    }
  });

  it.each(['/pta/api/v1/uploads/', '/rund/api/v1/uploads/', '/services/rund/api/v1/uploads/', '/uploads/', ''])('LEGACY_LOCAL lee y retira la misma copia local con %s', async prefix => {
    const filePath = join(folder, 'soporte.pdf');
    fs.writeFileSync(filePath, 'original');
    const reference = prefix + 'carpeta-digital/DOCENTE%20PRUEBA/RUND/soporte.pdf';
    const storage = new RundDocumentStorageService();
    expect((await storage.read('LEGACY_LOCAL', reference)).toString()).toBe('original');
    await storage.remove('LEGACY_LOCAL', reference);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('LEGACY_LOCAL no intenta leer ni borrar una referencia ajena o fuera de uploads', async () => {
    const storage = new RundDocumentStorageService();
    const file = join(folder, 'original.pdf');
    fs.writeFileSync(file, 'conservar');
    await expect(storage.read('LEGACY_LOCAL', '/auth/api/v1/uploads/original.pdf')).rejects.toThrow('no permitida');
    await expect(storage.remove('LEGACY_LOCAL', '/rund/api/v1/uploads/../../original.pdf')).rejects.toThrow('no permitida');
    expect(fs.readFileSync(file, 'utf8')).toBe('conservar');
  });
});
